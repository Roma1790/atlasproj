import { Feature } from "ol";
import { Circle, Geometry } from "ol/geom";
import { Modify } from "ol/interaction";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { globalStore } from "../state/store";
import Button from "ol-ext/control/Button"
import Atlas from "./atlas";
import { Job } from "../types/customTypes";
import JobLayer from "./jobLayer";

export default class CircleLayer {
    private circlelayer: VectorLayer<VectorSource<Geometry>>
    private circle: Circle
    private feature: Feature<Geometry>
    /**
     * Creates an instance of CircleLayer
     * when initialized the layer contains no content. Content can be set with given Methods
     *
     * @param 
     * @memberof CircleLayer
     */
    public constructor() {
      this.circlelayer = new VectorLayer({
          source: new VectorSource()
      })
      this.circle =  new Circle([])
      this.feature = new Feature(this.circle)
      
    }
    /**
     * adds a preconfigured ModifyFunction to the circle in CircleLayer
     *
     * @param atlas 
     * @returns 
     */
    public circleAddModify(atlas: Atlas): boolean{
        var modify = new Modify({
            source: this.circlelayer.getSource()
          })
          atlas.map.addInteraction(modify)
      
          //modify end Function
          modify.on("modifyend", () => {
          if(this.circle.getRadius() < 10*1000){
            this.circle.setRadius(10*1000)
            alert("Mindestradius beträgt 10km")
          }
          let rad = Math.floor(this.circle.getRadius() / 1000)
          this.circle.setRadius(rad*1000)
          globalStore.dispatch("setSelectedGeometries",[this.circle])
          document.getElementById("radVal")!.setAttribute("value",rad.toString())
          })
        return true;
    }
    /**
     * Getter Method for layer
     * @returns layer of CircleLayer class
     */
    public getcircleLayer(): VectorLayer<VectorSource<Geometry>>{
        return this.circlelayer
    }
    /**
     * Getter Method for circle
     * @returns circle of CircleLayer class
     */
    public getCircle(): Circle{
        return this.circle
    }
    /**
     * Sets the circle of the CircleLayer to given Position
     * @param coordinates coordinates as meters (Epsg3857)
     * @param radius radius in meter
     */
    public setCircle(coordinates:number[],radius: number){
        this.circle.setCenterAndRadius(coordinates,radius)
        this.circlelayer.getSource().clear()
        this.feature.setGeometry(this.circle)
        this.circlelayer.getSource().addFeature(this.feature)  
    }
    /**
     * Add a circle to the CircleLayer with given Position
     * @param coordinates coordinates as meters (Epsg3857)
     * @param radius radius in meter
     */
    public addCircle(coordinates: number[], radius: number){
        this.circle.setCenterAndRadius(coordinates,radius)
        this.feature.setGeometry(this.circle)
        this.circlelayer.getSource().addFeature(this.feature)  
    }
    /**
   * Create a button to remove the circle selection.
   * @private
   * @returns
   * @memberof Atlas
   */
  public circleSelectRemoveButton(atlas: Atlas): void {
    const showJobs = (jobs: Job[]): void => {
      const ul = document.getElementById("jobs") as HTMLUListElement
      ul.innerHTML = ""
      jobs.forEach((job) => {
        const div = document.createElement("div")
        const title = document.createElement("p")
        const link = document.createElement("a")
        const image = document.createElement("img")
        image.src = job.logo
        link.href = job.url
        link.innerText = "website"
        title.innerHTML = job.title
    
        div.append(image)
        div.appendChild(link)
        div.appendChild(title)
        div.setAttribute("style", "margin: 1em; padding: 1em; background: white; border-radius: 5px; overflow: hidden;")
    
        ul.appendChild(div)
      })
    }
    return new Button({
      html: "R",
      className: "",
      title: "Remove Circle Selection",
      handleClick: () => {
        this.circlelayer.getSource().clear()
        atlas.JobLayer.marker.getSource().clear()
        globalStore.dispatch("setSelectedGeometries", [])
        globalStore.dispatch("setJobLocation", globalStore.getState().jobLocationsAll)
        showJobs(globalStore.getState().allJobs)
        atlas.zoomTo([0,0],1)
      },
    })
  }
    
  }