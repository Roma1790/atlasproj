import Bar from "ol-ext/control/Bar"
import BaseLayer from "ol/layer/Base"
import Charon from "../apis/charon"
import FullScreen from "ol/control/FullScreen"
import JobLayer from "./jobLayer"
import SelectionLayer from "./selectionLayer"
import View from "ol/View"
import { Attribution, OverviewMap, Zoom } from "ol/control"
import { Select } from "ol/interaction"
import { Extent, boundingExtent} from "ol/extent"
import { filterJobs } from "./geometryFilter"
import { fromLonLat, transformExtent } from "ol/proj"
import { Job, RawLocation } from "../types/customTypes"
import { Map, Feature, } from "ol"
import { State, Store, globalStore } from "../state/store"
import TileLayer from "ol/layer/Tile"
import OSM from "ol/source/OSM"
import { metrics } from "./tracking"
import { degrees2meters } from "./util"
import { Geometry } from "ol/geom"
import { Style } from "ol/style"
import CircleStyle from "ol/style/Circle"
import CircleLayer from "./circleLayer"


/**
 * Initial map configuration options.
 *
 * @interface AtlasOpts
 */
export interface AtlasOpts {
  /**
   * Provide this if you want to show a specifig area of the map on startup.
   * This will be overridden by view.
   *
   * @memberof AtlasOpts
   */
  extent?: Extent
  /**
   * Initial latitude, longitude and zoom level. Default = { lat: 45, lon: 0, zoom: 2 }.
   * Providing this option will override extent.
   *
   * @memberof AtlasOpts
   */
  view?: {
    lat: number
    lon: number
    zoom: number
  }
}

/**
 * Main Map class and entrypoint.
 *
 * @class Atlas
 */
export default class Atlas {
  /**
   * Used to find the correct HTMLElement to attach the map.
   *
   * @private
   * @memberof Atlas
   */
  private mapID: string
  public map: Map
  public store: Store
  public JobLayer: JobLayer
  public circleLayer: CircleLayer
  private zIndices: Record<string, number>
  private selectionLayer: SelectionLayer

  /**
   *Creates an instance of Map.
   *
   * @param mapID
   * @param [opts]
   * @memberof Atlas
   */
  public constructor(mapID: string, opts?: AtlasOpts) {
    this.mapID = mapID
    this.zIndices = {
      tiles: 0,
      countries: 10,
      circleSelect: 10,
      jobs: 500,
    }

    this.map = this.build(opts || {})
    this.selectionLayer = new SelectionLayer()
    this.map.addLayer(this.selectionLayer)
    this.addCircleLayer()
    this.addControls()
    this.buildJobLayer()
    this.addVisibleJobsHook()
    this.addGeometriesHook()
    this.addJobFilterHook()
    this.addSelect()
  }

  /**
   * Subscribe to an event.
   *
   * Events are prefixed by `STATE_CHANGE_` and named after the field that was updated.
   * For example `STATE_CHANGE_VISIBLEJOBS` or `STATE_CHANGE_SELECTEDGEOMETRIES`.
   *
   * This can be used to update external UI like job counters.
   * Also used when the user clicks on a cluster to pass the job array outside of this class.
   * You can also pass in multiple hooks and your callback will be called whenever one of the events fires.
   *
   * @example
   * ```typescript
   * const atlas = new Atlas()
   * atlas.subscribe(["STATE_CHANGE_ALLJOBS"], (state: State) => console.log(state.allJobs))
   * atlas.setJobs(myJobsArray)
   *
   * // you will now see your job array being printed in the console.
   * ```
   *
   * @param hooks - An array of hooks, see ../state/store.ts.
   * @param callback - Gets called with the current state as argument, do whatever you want with it except overwriting it.
   * The state must remain immutable.
   * @memberof Atlas
   */
  public subscribe(hooks: string[], callback: (state: State) => void): void {
    globalStore.events.subscribe(hooks, callback)
  }

  /**
   * Runs a user search for a place, country, etc.
   * This requires the backend to be running and configured properly via environmental variables.
   * See ../apis/charon.ts for more info.
   *
   * @param query
   * @returns
   * @memberof Atlas
   */
  async search(query: string,postreq:boolean, kategorie?: string, branche?: string[]): Promise<void> {
    // 
    if (query.length > 0) {
      /* POST and then setjobs..
        if(postreq){
        new Jobs().get().then((jobs)=>{
          this.store.dispatch("setJobs",jobs)
      }
      })*/
      const geojson = await new Charon().forwardGeocoding(query)
      if (geojson === undefined) {
        console.error("Could not find " + query)
        return
      }
      let geo = geojson.features[0].geometry
      const features = this.selectionLayer.addFeatureFromGeojson(geojson)
      // Feature stays in Map maybe delete?
      let view = this.map.getView();
      let zoom = view.getZoom();
      let viewcenter = view.getCenter();
      const geometry = features[0].getGeometry()
      // Select searched place to be visible
      globalStore.dispatch("setSelectedGeometries",[geometry])
      // Zoom out when your zoomed in
      if(zoom as number > 4){
        // Timeout to give the map time to update its view with visible jobs
        setTimeout( () => {this.zoomTo(viewcenter as number[], 4)}, 400)
        setTimeout( () => {
          this.map.getView().fit((geometry as Geometry).getExtent(), {duration: 1000, maxZoom: 19 })
        }, 3700)
      }
      else{
        setTimeout(()=>{
          this.map.getView().fit((geometry as Geometry).getExtent(), {duration: 1000, maxZoom: 19 })
        }, 400)
        //view.animate({zoom: zoom - 8}, {center: view.getCenter()});
    //setTimeout(()=>{this.map.getView().fit(extent, { duration: 3000 })},200)
    this.map.getView().fit((geometry as Geometry).getExtent(), {duration: 1000, maxZoom: 19 })
      }
    }
  }
/**
 * 
 * @param query  searchquery
 * @param radius  radius in km
 * @param kategorie  category of job as id
 * @param fakultaet  
 * @param branche  branche as id array
 * @returns doing a radiussearch on the map
 */
  async radiusSearch(query: string,radius:number,postreq:boolean, kategorie?: string,  branche?: string[]): Promise<void> {
    // Modify that Request goes to Our backend not to nominatim at forwardGeocoding2
    const geojson = await new Charon().forwardGeocoding2(query)
    if (geojson === undefined) {
      console.error("Could not find " + query)
       return
    }
    // Coordinate = [lat,lon] = "EPSG:4236"
    // Coordinate = [x in meter, y in meter] = "EPSG:3857"
    let latlon = geojson.features[0].geometry.coordinates
    let coordinate = degrees2meters(latlon[0],latlon[1])
    //Create a new Circle in the circlelayer.
    let circle = this.circleLayer.getCircle()
    this.circleLayer.setCircle(coordinate, radius*1000)
    //Set circle to be visible.
    globalStore.dispatch("setSelectedGeometries",[circle])
    //Zoom into Circle
    setTimeout(()=>{
      this.map.getView().fit(circle.getExtent(), {duration: 1000, maxZoom: 19 })
    },500) 
  }

  /**
   * Moves the viewport to a center and zoom level.
   * Can be used to zoom in on clusters.
   *
   * @private
   * @param  center
   * @param [zoom=16]
   * @memberof Atlas
   */
   public zoomTo(center: number[], zoom = 16): void {
    this.map.getView().animate({
      center: center,
      zoom: zoom,
      duration: 1200
    })
  }
   /**
   * Add the possibilty to select features.
   *
   * This handles the countries to be selected as well as clicking on job clusters.
   */
    private addSelect(): void {
      const select = new Select({
        layers: [this.JobLayer.animatedCluster],
        style: new Style({
          image: new CircleStyle({
            radius: 0,
          }),
        }) 
      })
      this.map.addInteraction(select)
      let selectedLoc: RawLocation[]
      select.on("select", (e) => {
        var selectedFeatures = select.getFeatures()
        selectedFeatures.forEach((f: Feature<Geometry>) => {
          const clickedClusters = f.get("features")
          const clickedLoc: RawLocation[] = clickedClusters.map((f: Feature<Geometry>) => f.get("job"))
          // Add filtered Location again to JobLocations
          if(selectedLoc){
            globalStore.dispatch("addJobLocation", selectedLoc)
            selectedLoc = []
          }
          // Sort JobLocation and Cluster in ascending Order and than create a filteredLocation[] 
          // after that sequence the filterLoc does not contain contents of clickedLoc, a marker 
          // is being placed on that position- currently linear search--  maybe binary? 
          let filterloc: RawLocation[] = []
          let j = 0;   
          clickedLoc.sort((first, second) => 0 - (first.IDs > second.IDs ? -1 : 1));
          globalStore.getState().jobLocations.sort((first, second) => 0 - (first.IDs > second.IDs ? -1 : 1));
          for(let i = 0; i < globalStore.getState().jobLocations.length ; i++){
            if(j == clickedLoc.length){
              filterloc.push(globalStore.getState().jobLocations[i])
            }
            else if(globalStore.getState().jobLocations[i].IDs != clickedLoc[j].IDs){
              filterloc.push(globalStore.getState().jobLocations[i])
            }
            else{
              j++
            }
          }
          // SetJobLocation for display on map and selectLoc for display in table
          globalStore.dispatch("setJobLocation", filterloc)
          globalStore.dispatch("setSelectedLocation", clickedLoc)
          selectedLoc = clickedLoc
          
        })
      })
    }
  /**
   * Subscribes to the store to update the jobs on the map.
   *
   * @memberof Atlas
   */
  addVisibleJobsHook(): void {
    globalStore.events.subscribe(["STATE_CHANGE_JOBLOCATIONS", "STATE_CHANGE_VISIBLEJOBS"], (state) => {
      this.JobLayer.setJobs(state.jobLocations)
      
    })
  }

  /**
   * Subscribes to the store to update the selected countries on the map.
   *
   * @memberof Atlas
   */
  addGeometriesHook(): void {
    globalStore.events.subscribe(["STATE_CHANGE_SELECTEDGEOMETRIES", "STATE_CHANGE_ALLJOBS"], (state) => {
      this.selectionLayer.setVisibleFeatures(state.selectedGeometries)
    })
  }

  /**
   * Subscribes to the store to update state's visible jobs.
   * Whenever the jobs change, like jobs being added or removed, or if the user (de)selects geometry, we need to update the shown jobs.
   *
   * @memberof Atlas
   */
  addJobFilterHook(): void {
    globalStore.events.subscribe(["STATE_CHANGE_ALLJOBS", "STATE_CHANGE_SELECTEDGEOMETRIES"], (state) => {
      let newShownJobs: Job[] = []
      let newShownLocation: RawLocation[] = []
      
      if (globalStore.getState().selectedGeometries.length === 0) {
        newShownJobs = state.allJobs
        newShownLocation = state.jobLocationsAll
      } else {
        newShownJobs = filterJobs(state.allJobs, {
          geometries: state.selectedGeometries,
        })
        // Funktioniert zwar ist aber nicht gut ...
        for(let i = 0; i < state.jobLocationsAll.length; i++){
          for(let j = 0; j< newShownJobs.length; j++){
            if(state.jobLocationsAll[i].IDs.includes(newShownJobs[j].id.toString()) && !newShownLocation.includes(state.jobLocationsAll[i])){
              newShownLocation.push(state.jobLocationsAll[i])
            } 
          }
        }
      }
      globalStore.dispatch("setVisibleJobs", newShownJobs)
      globalStore.dispatch("setJobLocation", newShownLocation)
      
    })
  }

  /**
   * Creates a named layer and adds it to the existing openlayers map.
   * By default a layer is not overwritten.
   *
   * @private
   * @param layer - The layer you want to add.
   * @param opts - Configuration options.
   * @param opts.name - The name for the layer. You can later reference the layer by this name.
   * @param opts.overwrite - By default the layer does not overwrite itself.
   */
  private addLayer(layer: BaseLayer, opts: { name?: string; overwrite?: boolean } = {}): void {
    const { name = "", overwrite = false } = opts

    if (this.map.getLayers().getArray().indexOf(layer) === -1 || overwrite) {
      if (name !== "") {
        layer.set("name", name)
        
      }
      this.map.addLayer(layer)
    }
  }

  /**
   * Add sidebar controls to the map.
   * TODO: Move this outside of the class.
   *
   * @private
   * @returns
   * @memberof Atlas
   */
  private addControls(): any {
    const mainbar = new Bar()
    mainbar.setPosition("left-top")
    this.map.addControl(new FullScreen())
    this.map.addControl(mainbar)
    mainbar.addControl(this.circleLayer.circleSelectRemoveButton(this))

    return mainbar
  }
  /**
   * Creates the CircleLayer, mainly used in radius searching
   */
  private addCircleLayer(){
    this.circleLayer = new CircleLayer()
    this.map.addLayer(this.circleLayer.getcircleLayer())
    this.circleLayer.circleAddModify(this)
  }

  /**
   * Create an initial viewport in the following order:
   *
   * 1. From a specified `view` object in mapOpts.
   * 2. From a specified `extent` onject
   * 3. If neither options were given, create a default view centered on europe.
   *
   * @private
   * @param opts - View configuration should be in this object.
   * @returns  The View object for initial map rendering.
   * @memberof Atlas
   */
  private createView(opts: AtlasOpts): any {
    if (opts.view) {
      return new View({
        center: fromLonLat([opts.view.lon, opts.view.lat]),
        zoom: opts.view.zoom,
      })
    } else if (opts.extent) {
      const view = new View()
      view.fit(opts.extent)

      return view
    } else {
      return new View({
        center: fromLonLat([0, 45]),
        zoom: 0,
      })
    }
  }

  /**
   * Create the actual map canvas.
   * Loads in tiles and displays the initial viewport.
   *
   * @private
   * @param opts
   * @returns
   * @memberof Atlas
   */
  private build(opts: AtlasOpts): Map {
    const source = new OSM()

    source.on("tileloadstart", () => {
      metrics.addtileLoad()
    })

    const rasterLayer = new TileLayer({
      source,
    })

    // const rasterLayer = new OSMLayer().getLayer()
    // const vectorLayer = new MapboxLayer().getLayer()
    const controls = [
      new Attribution({
        collapsible: true,
      }),
      new OverviewMap({
        layers: [new TileLayer({ source: new OSM() })],
      }),
      new Zoom(),
    ]
    
    const map = new Map({
      target: this.mapID,
      controls: controls,
      view: this.createView(opts),
    })
    this.map = map
    this.addLayer(rasterLayer, { name: "rasterTiles" })
    // this.addLayer(vectorLayer, { name: "vectorTiles" })

    return map
  }

  /**
   * TODO: Refactor  #AT-15.
   *
   * @private
   * @memberof Atlas
   */
  private buildJobLayer(): void {
    this.JobLayer = new JobLayer(60)
    this.JobLayer.animatedCluster.setZIndex(this.zIndices.jobs)
    this.addLayer(this.JobLayer.animatedCluster, { name: "cluster" })
    this.addLayer(this.JobLayer.marker, {name: "selectedMarker"})
  }

 /**
  * Build Extent out of coordinates and then zoom into it. Extent is a Square 
  * @param coordinates 
  */
  public zoomToBuildedExtent(coordinates: number[][]): void {

    const extent = transformExtent(boundingExtent(coordinates), "EPSG:4326", "EPSG:3857")
    // this.zoomToExtent(buffer(extent, 100_000 / this.map.getView().getZoom()))
    this.map.getView().fit(extent, {duration: 1000, maxZoom: 19 })
  }
}
