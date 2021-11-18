/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Charon from "../apis/charon"
import { Jobs } from "../apis/jobs"
import { globalStore, State } from "../state/store"
import { Job, GeocodingResponseObject, SingleLocation } from "../types/customTypes"
import Atlas from "./atlas"
import { arrayContainsContent, isSingleLocation } from "./util"
import { metrics } from "./tracking"
import { globalAgent } from "http"
import { Geometry } from "ol/geom"
import Sample from "../apis/sample"
import { Draw } from "ol/interaction"
import { SSL_OP_NETSCAPE_REUSE_CIPHER_CHANGE_BUG } from "constants"
import Source from "ol/source/Source"
import VectorLayer from "ol/layer/Vector"

/**
 * Displays a list of jobs under the map.
 *
 * @param jobs - The jobs the user clicked on.
 */
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
/**
 * Gets called when the user clicks on a cluster.
 *
 * Depending on our test setup we either zoom in and display jobs only if we cannot zoom in any further.
 * Or we zoom in and show always.
 *
 * @param atlas
 * @param jobs
 */
const handleClick = (atlas: Atlas, jobs: Job[]): void => {
  if (process.env.TEST_DISPLAY_ALWAYS === "true") {
    showJobs(jobs)
  } else {
    const locations: SingleLocation[] = []
    jobs.forEach((job) => {
      job.locations.forEach((location) => {
        if (isSingleLocation(location)) {
          locations.push(location)
        }
      })
    })
    const areEqual = locations.every((location, i, arr) => location.lat === arr[0].lat && location.lon === arr[0].lon)

    if (areEqual) {
      showJobs(jobs)
    } else {
      atlas.zoomToLocationCluster(locations)
    }
  }
}

const atlas = new Atlas("map-container")

// Update UI StateChange Handler
atlas.subscribe(["STATE_CHANGE_ALLJOBS"], (state: State) => {
  document.getElementById("allJobsCounter")!.innerText = state.allJobs.length.toString()
})
atlas.subscribe(["STATE_CHANGE_VISIBLEJOBS"], (state: State) => {
  let visibleJobs = state.visibleJobs.length.toString()+" Treffer";
  document.getElementById("visibleJobsCounter")!.innerText = visibleJobs;
})
atlas.subscribe(["STATE_CHANGE_SELECTEDJOBS"], (state: State) => {
  handleClick(atlas, state.selectedJobs)
})


// Get Elements of HTML
const searchField = document.getElementById("searchField") as HTMLInputElement
const radVal = document.getElementById("radVal") as HTMLInputElement
const searchForm = document.getElementById("searchForm")
const resetbutton = document.getElementById("resetter")
// grade nicht verwendet const fakultaet = document.getElementById("fakultaet") as HTMLSelectElement
const kategorie = document.getElementById("kategorie") as HTMLSelectElement
const branche = document.getElementsByClassName("checkboxes") as HTMLCollectionOf<HTMLInputElement>
// ResetterButton
resetbutton!.addEventListener("click", () => {
  globalStore.dispatch("setVisibleJobs", globalStore.getState().allJobs)
  globalStore.dispatch("setSelectedGeometries",[])
  // Request for Jobs again... 
  new Jobs("https://raw.githubusercontent.com/chronark/atlas/master/static/rawJobs.json").get().then((jobs) => {
    globalStore.dispatch("setJobs", jobs)
  })
  // remove Circle Layer
  const allLayers = atlas.map.getLayers()
  allLayers.forEach((layer) => {
    if (layer.get("name") =="radiusCircle") {
      atlas.map.removeLayer(layer)
    }
  })
  // Zoom to Center
  atlas.zoomTo([0,0], 0)
})
// SubmitMethod
if (searchField !== null && searchForm !== null) {
  searchForm.addEventListener("submit", (event) => {
    let postreq = false; 
    const query = searchField.value
    const radQuery = radVal.valueAsNumber
    // FilterOptionen values müssen in id's übersetzt werden. 
    let kategorieVal = kategorie.nodeValue 
     // grade nicht verwendet let fakultaetVal = fakultaet.nodeValue 
    let brancheVal : HTMLInputElement[] = new Array(46)
    for(var counter:number = 0; counter<46; counter++){
      brancheVal[counter] = branche.item(counter) as HTMLInputElement
    }
  
    if(kategorieVal!==null || arrayContainsContent(brancheVal)){
      postreq = true; 
    }
    // RadiusSearch ?? 
    if((document.getElementById("radSearch") as HTMLInputElement).checked == true){
      console.log("radiussearching...")
      atlas.radiusSearch(query,radQuery,postreq)
    }
    else{
      atlas.search(query,postreq)
    }
    
    event.preventDefault()
  })
}

// Geht im Moment noch nicht, Quelle muss Request erlauben. CORS
 /*new Jobs().get().then( (jobs) => {
  atlas.setJobs(jobs)
})*/
/*Sample Creator 
let sample = new Sample()
sample.jobs(5000).then( (jobs)=>{
  atlas.setJobs(jobs)
})
*/
// Using local source because of CORS problems.
new Jobs("https://raw.githubusercontent.com/chronark/atlas/master/static/rawJobs.json").get().then((jobs) => {
  globalStore.dispatch("setJobs", jobs)
  

   /*new Charon().forwardGeocoding("Bayern").then((geojson: GeocodingResponseObject | undefined) => {
    if (geojson) {
      jobs.push({
        corp: "Bayern",
        locations: [geojson.features],
        date: "",
        id: 0,
        logo: "",
        // TODO a score must be added
        score: Math.random(),
        title: "",
        type: "",
        url: "",
      })
      atlas.setJobs(jobs)
      
    }
  })*/
})





//#region UserVerhalten Erfassung
const startButton = document.getElementById("start")
const stopButton = document.getElementById("stop")
/* eslint-disable-next-line */
startButton?.addEventListener("click", () => {
  metrics.reset()
  startButton.innerText = "Reset"
})

atlas.map.on("click", () => {
  metrics.addClick()
})
/* eslint-disable-next-line */
stopButton?.addEventListener("click", () => {
  metrics.stop()

  alert("Bitte den untenstehenden Text kopieren\n\n" + metrics.getResult())

  console.log(metrics.getResult())
  startButton!.innerText = "Start"
})
//#endregion
