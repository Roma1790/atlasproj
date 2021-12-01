import { Area, Job, Location, SingleLocation } from "../types/customTypes"
import AnimatedCluster from "ol-ext/layer/AnimatedCluster"
import Cluster from "ol/source/Cluster"
import Feature from "ol/Feature"
import GeoJSON from "ol/format/GeoJSON"
import JobStyle from "../styles/jobs"
import { Geometry, Point } from "ol/geom"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import { fromLonLat } from "ol/proj.js"
import { isSingleLocation } from "./util"


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
  }

  /**
   * Clears the current jobs and applies the new ones.
   *
   * @param  jobs
   * @memberof JobLayer
   */
  public setJobs(jobs: Job[]): void {
    const { areas, points } = this.createFeatures(jobs)

    this.cluster.getSource().clear()
    this.cluster.getSource().addFeatures(points)

    this.areas.getSource().clear()
    this.areas.getSource().addFeatures(areas)
  }

  /**
   *Transform the jobs from the api specififaction into a useful format.
   *
   * Splits jobs into areas and points to support both areas as well as single location jobs.
   *
   * @private
   * @param  jobs
   * @returns
   * @memberof JobLayer
   */
  private createFeatures(jobs: Job[]): { areas: Feature<Geometry>[]; points: Feature<Geometry>[] } {
    const points: Feature<Geometry>[] = []
    const areas: Feature<Geometry>[] = []
    jobs.forEach((job) => {
      job.locations.forEach((location: Location) => {
        if (isSingleLocation(location)) {
          const newFeature = this.createSingleLoationFeature(location)
          newFeature.set("job", job, false)
          points.push(newFeature)
        } else {
          // never called
          const newArea = this.createAreaFeature(location)
          newArea.set("job", job, false)
          areas.push(newArea)
        }
      })
    })
    
    return { areas, points }
  }

  /**
   * Construct a feature from a single location.
   *
   * @private
   * @param  location
   * @returns
   * @memberof JobLayer
   */
  private createSingleLoationFeature(location: SingleLocation): Feature<Geometry> {
    return new Feature({
      geometry: new Point(fromLonLat([location.lon, location.lat]), ),
    })
  }

  /**
   * Construct a feature from an area.
   *
   * @private
   * @param location
   * @returns
   * @memberof JobLayer
   */
  private createAreaFeature(location: Area): Feature<Geometry> {
    const newFeature = new GeoJSON({
      featureProjection: "EPSG:3857",
    }).readFeature({
      type: "Feature",
      geometry: location[0].geometry,
    })
    newFeature.setStyle(this.style.areaStyle(newFeature))
    return newFeature
  }
}
