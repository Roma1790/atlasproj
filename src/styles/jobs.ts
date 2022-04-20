import { Stroke, Style, Text } from "ol/style.js"
import { Color } from "./color"
import { Feature } from "ol"
import Fill from "ol/style/Fill"
import { Job} from "../types/customTypes"
import RegularShape from "ol/style/RegularShape"
import { bound } from "../lib/util"
import CircleStyle from 'ol/style/Circle';
import { Geometry } from "ol/geom"
import BaseObject from "ol/Object"

/**
 * Create a style for job clusters based on their score and proximity to each other.
 *
 * @class JobStyle
 */
export default class JobStyle {
  private colorGradient: Color[]

  /**
   * Creates an instance of JobStyle.
   *
   * @param colorGradient
   * @memberof JobStyle
   */
  public constructor(
    colorGradient: Color[] = [
      new Color(112, 148, 194),
      new Color(103, 142, 191),
      new Color(93, 135, 188),
      new Color(84, 129, 186),
      new Color(47, 103, 174),
      new Color(75, 122, 183),
      new Color(65, 116, 180),
      new Color(56, 109, 177),
      new Color(37, 96, 171),
      new Color(28, 90, 168),
      new Color(19, 83, 166),
      new Color(9, 77, 163),
      new Color(0, 70, 160),
    ],
  ) {
    this.colorGradient = colorGradient
  }

  /**
   * Choose a color from the colorGradient by score.
   *
   * @private
   * @param score
   * @param [minScore=0.5]
   * @returns A single color from the colorGradient.
   * @memberof JobStyle
   */
  private colorByScore(score: number, minScore = 0.5): Color {
    if (score < 0 || score > 1) {
      throw new RangeError("score must be between 0 and 1, including 0 and 1.")
    }
    if (minScore < 0 || minScore > 1) {
      throw new RangeError("minScore must be between 0 and 1, including 0 and 1.")
    }
    if (minScore >= score) {
      return this.colorGradient[0]
    }
    const step = (1 - minScore) / this.colorGradient.length
    const index = Math.floor((score - minScore) / step)

    return this.colorGradient[index]
  }

  /**
   * Calculate the maximum score from a cluster of jobs.
   *
   * @private
   * @param features
   * @returns The score of the best matching job.
   * @memberof JobStyle
   */
  private maxScore(features: Feature<Geometry>[]): number {
    let maxScore = 0
    for (const feature of features) {
      const job: Job = feature.get("job")
      const score: number = job.score
      maxScore = Math.max(maxScore, score)
    }
    return maxScore
  }

  /**
   * Create a regular polygon as icon to display a cluster.
   *
   * @private
   * @param score - Determines the color for the cluster.
   * @param size - The size of the polygon will scale with the number of jobs inside the cluster.
   * @returns
   * @memberof JobStyle
   */
  private pointStyle(score: number, size: number): Style {
    const radius = bound(15, size, 25)
    return new Style({
      image: new RegularShape({
        points: 1,
        angle: Math.PI,
        radius: radius,
        stroke: new Stroke({
          color: this.colorByScore(score, 0.5).rgb(),
          width: bound(1, radius / 4, radius),
          lineCap: "round",
          lineJoin: "round",
        }),
        fill: new Fill({
          color: "rgba(255,255,255,0.8)",
        }),
      }),
      text: new Text({
        text: size.toString(),
        scale: 1,
        fill: new Fill({
          color: "#000",
        }),
      }),
    })
  }
  private polygonStyle(score: number, size: number, weight: number): Style {
    const radius = bound(15, size, 25)
    return new Style({
      image: new CircleStyle({
  
        
        radius: radius,
        stroke: new Stroke({
         color: "rgba(0,255,0,0.8)",
          width: bound(1, radius / 4, radius),
          
        }),
        fill: new Fill({
          color: "rgba(255,255,255,0.8)",
        }),
      }),
      text: new Text({
        text: weight.toString(),
        scale: 1,
        fill: new Fill({
          color: "#000",
        }),
      }),
    })
  }
  private polygonStyle2(score: number, size: number, weight: number): Style {
    const radius = bound(15, size, 25)
    return new Style({
      image: new CircleStyle({
  
        
        radius: radius,
        stroke: new Stroke({
          color: "rgba(0,255,0,0.8)",
          width: bound(1, radius / 4, radius),
          
        }),
        fill: new Fill({
          color: "rgba(255,0,0,0.8)",
        }),
      }),
      text: new Text({
        text: weight.toString(),
        scale: 1,
        fill: new Fill({
          color: "#000",
        }),
      }),
    })
  }
  

  /**
   * Build the style for a job cluster.
   *
   * @param  cluster
   * @returns
   * @memberof JobStyle
   */
  public clusterStyle(cluster: Feature<Geometry>): Style[] {
    const features: Feature<Geometry>[] = cluster.get("features")
    const weight = features[0].get("weight")
    const size = features.length 
    const score = this.maxScore(features)
    let style : Style
    /**
     * Punkte nicht von Jobs nehmen sondern von Orte...
     */
    if(features.length > 1){
      //Cluster
      let weight = 0;
      for(let i = 0; i< features.length; i++){
        weight+= features[i].get("weight")
      }
      style = this.polygonStyle(score, size, weight)
      
    }
    else{
      //Point
      
      style = this.polygonStyle2(score, size, features[0].get("weight"))
    }
    
    
     
    return [style]
  }

  /**
   * Build the style for a job area.
   *
   * @param  feature
   * @returns
   * @memberof JobStyle
   */
  public areaStyle(feature: Feature<Geometry>): Style {
    const color = this.colorByScore(this.getScore(feature))
    return new Style({
      stroke: new Stroke({
        color: color.rgb(),
        width: 1,
      }),
      fill: new Fill({
        color: color.rgba(0.2),
      }),
    })
  }

  /**
   * Extract the score from a feature.
   *
   * @private
   * @param  feature
   * @returns
   * @memberof JobStyle
   */
  private getScore(feature: Feature<Geometry>): number {
    const subfeatures: Feature<Geometry>[] = feature.get("features")

    if (subfeatures && subfeatures.length === 1) {
      const job: Job = subfeatures[0].get("job")
      return job.score
    }

    return 0
  }
}
