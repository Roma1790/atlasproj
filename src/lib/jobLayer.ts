import { Area, Job, Location, RawLocation, SingleLocation } from "../types/customTypes"
import AnimatedCluster from "ol-ext/layer/AnimatedCluster"
import Cluster from "ol/source/Cluster"
import Feature from "ol/Feature"
import GeoJSON from "ol/format/GeoJSON"
import JobStyle from "../styles/jobs"
import { Geometry, Point } from "ol/geom"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import { fromLonLat, Projection, transformExtent } from "ol/proj.js"
import { isSingleLocation } from "./util"
import { Coordinate, scale } from "ol/coordinate"
import { Console } from "console"
import { text } from "stream/consumers"
import { Icon, Style } from "ol/style"
import { boundingExtent, getCenter } from "ol/extent"


/**
 * The Joblayer is responsible for displaying and animating as clusters.
 *
 * TODO: Refactor to implement ol/Layer #AT-15.
 *
 * @class JobLayer
 */
export default class JobLayer {
  private cluster: Cluster
  public animatedCluster: VectorLayer<VectorSource<Geometry>>
  public areas: VectorLayer<VectorSource<Geometry>>
  public marker: VectorLayer<VectorSource<Geometry>>
  private style: JobStyle


  /**
   *Creates an instance of JobLayer.
   *
   * @param [distance=40]
   * @memberof JobLayer
   */
  public constructor(distance = 40) {
    this.style = new JobStyle()

    // sets up an empty cluster layer
    this.cluster = new Cluster({
      distance: distance,
      source: new VectorSource(),
    })

    this.animatedCluster = new AnimatedCluster({
      name: "Jobs",
      source: this.cluster,
      style: (cluster: Feature<Geometry>) => this.style.clusterStyle(cluster),
    })
    this.areas = new VectorLayer({
      source: new VectorSource(),
    })
    this.marker = new VectorLayer({
      source: new VectorSource({
        features: [ new Feature({
          geometry: new Point([])
        })]
      }),
      style: new Style({
        image: new Icon({
          anchor: [0.5, 0.9],
          src: require("./../css/R.png"),
          scale: 0.05,
        })
      })
    })
  }

  /**
   * Clears the current JobLocation and applies the new.
   *
   * @param  jobs
   * @memberof JobLayer
   */
  public setJobs(location: RawLocation[]): void {
    
    const points : Feature<Geometry>[] = []
    location.forEach(ort => {
      const newFeature = this.createSingleLocationFeat(ort)
      newFeature.set("job", ort, false)
      newFeature.set("weight", ort.weight, false)
      points.push(newFeature)
    });
    this.cluster.getSource().clear()
    this.cluster.getSource().addFeatures(points)
    

  }
  /**
   * Change the position of the Selection Marker
   * @param coordinates Destination Coordinate as [ epsg3857 ]
   */
  public modifySelectorPoint(coordinates: number[]){
    if(coordinates.length > 2){
      coordinates = getCenter(transformExtent(coordinates, "EPSG:4326", "EPSG:3857"))
    }
    var marker = this.marker.getSource().getFeatures()
    var point = marker[0].getGeometry() as Point
    point.setCoordinates(coordinates)
    
  }
  

  /**
   * Construct a feature from a RawLocation.
   *
   * @private
   * @param  location
   * @returns
   * @memberof JobLayer
   */
 
  private createSingleLocationFeat(location: RawLocation): Feature<Geometry> {
    return new Feature({
      geometry: new Point(fromLonLat([parseFloat(location.lng), parseFloat(location.lat)]), ),
    })
  }

  /**
   * Getter for cluster of JobLayer.
   *
   * @public
   * @returns current Cluster
   * @memberof JobLayer
   */
  public getCluster(): Cluster {
    return this.cluster
  }
}
