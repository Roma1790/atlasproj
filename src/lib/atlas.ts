import Bar from "ol-ext/control/Bar"
import BaseLayer from "ol/layer/Base"
import Button from "ol-ext/control/Button"
import Charon from "../apis/charon"
import FullScreen from "ol/control/FullScreen"
import JobLayer from "./jobLayer"
import polygonStyle from "../styles/polygon"
import SelectionLayer from "./selectionLayer"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import View from "ol/View"
import Circle from "ol/geom/Circle"
import { Attribution, OverviewMap, Zoom } from "ol/control"
import { Modify, Select } from "ol/interaction"
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
      jobs: 1000,
    }

    this.map = this.build(opts || {})
    this.selectionLayer = this.createSelectionLayer()
    this.map.addLayer(this.selectionLayer)
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
    // Circle Creation
    var circleLayer = this.getCircleLayer("radiusCircle", true)
    this.addLayer(circleLayer)
    var circle = new Circle(coordinate,radius*1000)
    var features = new Feature(circle)
    circleLayer.getSource().addFeature(features)  
    //Modify Add
    var modify = new Modify({
      source: circleLayer.getSource()
    })
    this.map.addInteraction(modify)

    //modify end Function
    modify.on("modifyend", () => {
    if(circle.getRadius() < 10*1000){
      circle.setRadius(10*1000)
      alert("Mindestradius beträgt 10km")
    }
    let rad = Math.floor(circle.getRadius() / 1000)
    circle.setRadius(rad*1000)
    
    
    globalStore.dispatch("setSelectedGeometries",[circle])
    document.getElementById("radVal")!.setAttribute("value",rad.toString())
    })
    //SelectedGeometries to be visible.
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
      duration: 3500
    })
  }

   /**
   * Add the possibilty to select features.
   *
   * This handles the countries to be selected as well as clicking on job clusters.
   */
    private addSelect(): void {
      const select = new Select({
        layers: [this.JobLayer.animatedCluster]
      })
      var selectedFeatures = select.getFeatures()
      this.map.addInteraction(select)
      select.on("select", () => {
        selectedFeatures.forEach((f: Feature<Geometry>) => {
          const clickedClusters = f.get("features")
          const clickedLoc: RawLocation[] = clickedClusters.map((f: Feature<Geometry>) => f.get("job"))
          globalStore.dispatch("setSelectedLocation", clickedLoc)
        })
      })
    }


  /**
   * Create a new Polygon layer and add the onClick event listener.
   *
   * Will be called once in the constructor.
   *
   * @private
   * @returns A new polygon layer for countries or other areas the user selected.
   * @memberof Atlas
   */
  private createSelectionLayer(): SelectionLayer {
    const selectionLayer = new SelectionLayer()
    return selectionLayer
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
    mainbar.addControl(this.circleSelectRemoveButton())

    return mainbar
  }

  /**
   * Create a button to remove the circle selection.
   * TODO: Move this outside of the class.
   *
   * @private
   * @returns
   * @memberof Atlas
   */
  private circleSelectRemoveButton(): void {
    return new Button({
      html: "R",
      className: "",
      title: "Remove Circle Selection",
      handleClick: () => {
        this.clearSource(this.getDrawLayer("drawLayer"))
        this.clearSource(this.getDrawLayer("radiusCircle"))
      },
    })
  }
  /**
   * Get or create a new layer to draw on.
   *
   * @private
   * @param clear
   * @returns
   * @memberof Atlas
   */
  private getDrawLayer(name: string,clear?: boolean): VectorLayer<VectorSource<Geometry>> {
    let [layer, wasCreated] = this.getOrCreateLayer(name, {
      source: new VectorSource(),
      // Sets the style after transformation
      style: polygonStyle(),
    })
    layer = layer as VectorLayer<VectorSource<Geometry>>
    if (!wasCreated && clear) {
      this.clearSource(layer)
    }
    layer.setZIndex(this.zIndices.circleSelect)
    return layer
  }
  /**
   * Create a new Layer with given name or return already existing layer with given name.
   * The Vector Source is being cleared on already existing Layer.
   * @param name Name of the Layer you want to add.
   * @param clear false = create new Layer, true = clear Source of existing Layer
   * @returns the layer with given name.
   */
  private getCircleLayer(name:string,clear?:boolean): VectorLayer<VectorSource<Geometry>> {
    let [layer, wasCreated] = this.getOrCreateLayer(name, {
      source: new VectorSource(),
      // Sets the style after transformation
      style: polygonStyle(),
    })
    layer = layer as VectorLayer<VectorSource<Geometry>>
    if (!wasCreated && clear) {
      this.clearSource(layer)
    }
    
    return layer
  }

  /**
   * Helper function to clear the source of a layer.
   *
   * @public
   * @param  layer
   * @returns
   * @memberof Atlas
   */
  public clearSource(layer: VectorLayer<VectorSource<Geometry>>): VectorLayer<VectorSource<Geometry>> {
    if (typeof layer.getSource === "function") {
      layer.getSource().clear()
    }
    return layer
  }

  /**
   * Filter all layers by name.
   *
   * @private
   * @param  names
   * @returns
   * @memberof Atlas
   */
  private getLayersByNames(names: string[]): VectorLayer<VectorSource<Geometry>>[] {
    const allLayers = this.map.getLayers()
    const filteredLayers: VectorLayer<VectorSource<Geometry>>[] = []
    allLayers.forEach((layer) => {
      if (names.includes(layer.get("name"))) {
        filteredLayers.push(layer as VectorLayer<VectorSource<Geometry>>)
      }
    })
    return filteredLayers
  }
  
  /**
   * Try to get a layer by name or create a new one if it doesn't exist.
   *
   * @private
   * @param name
   * @param  opts
   * @returns
   * @memberof Atlas
   */
  private getOrCreateLayer(name: string, opts: Record<string, any>): [VectorLayer<VectorSource<Geometry>>, boolean] {
    const layers = this.getLayersByNames([name])
    let layer: VectorLayer<VectorSource<Geometry>>, wasCreated: boolean
    switch (layers.length) {
      case 1:
        layer = (layers[0] as unknown) as VectorLayer<VectorSource<Geometry>>
        wasCreated = false
        break
      case 0:
        layer = new VectorLayer(opts)
        layer.set("name", name)
        wasCreated = true
        break
      default:
        throw Error(`I found more than one layer with this name: ${name}`)
    }
    return [layer, wasCreated]
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
        zoom: 2,
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
    this.addLayer(this.JobLayer.areas, { name: "areas" })
    
  }

  /**
   * Instantly set the map viewport to center on lat/lon and zoom level.
   *
   * @param  lon
   * @param  lat
   * @param  zoom
   * @memberof Atlas
   */
  public setView(lon: number, lat: number, zoom: number): void {
    this.map.getView().setCenter([lat, lon])
    this.map.getView().setZoom(zoom)
  }

 /**
  * Build Extent out of coordinates and then zoom into it.
  * @param coordinates 
  */
  public zoomToBuildedExtent(coordinates: number[][]): void {
    
    const extent = transformExtent(boundingExtent(coordinates), "EPSG:4326", "EPSG:3857")

    // this.zoomToExtent(buffer(extent, 100_000 / this.map.getView().getZoom()))
    this.map.getView().fit(extent, {duration: 1000, maxZoom: 19 })
  }
}
