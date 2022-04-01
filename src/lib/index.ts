/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Charon from "../apis/charon"
import { Jobs } from "../apis/jobs"
import { globalStore, State } from "../state/store"
import { Job, RawLocation} from "../types/customTypes"
import Atlas from "./atlas"
import { arrayContainsContent} from "./util"
import { metrics } from "./tracking"
import "core-js/stable/promise";
import "regenerator-runtime";
import { boundingExtent} from "ol/extent"
require('./../css/style.css');

const atlas = new Atlas("map-container")

// Update UI StateChange Handler
atlas.subscribe(["STATE_CHANGE_ALLJOBS"], (state: State) => {
  document.getElementById("allJobsCounter")!.innerText = state.allJobs.length.toString()
})
atlas.subscribe(["STATE_CHANGE_VISIBLEJOBS"], (state: State) => {
  let visibleJobs = state.visibleJobs.length.toString() + " Treffer"
  document.getElementById("visibleJobsCounter")!.innerText = visibleJobs
})
atlas.subscribe(["STATE_CHANGE_SELECTEDLOCATION"], (state: State) => {
  handleClick(atlas, state.selectedJobs, state.selectedLocation)
})
atlas.subscribe(["STATE_CHANGE_JOBLOCATIONS"],(state:State) => {
  showJobs(state.visibleJobs)
  showJobsBig(state.visibleJobs)
})
// Get Elements of HTML
const searchField = document.getElementById("searchField") as HTMLInputElement
const radVal = document.getElementById("radVal") as HTMLInputElement
const searchForm = document.getElementById("searchForm")
const branchSelector = document.getElementById("KT_1_button")
const checkbox = document.getElementById("KT_1_list") as HTMLDivElement
//change jobs to "JobList" when ready
const MapSwitch = document.getElementById("jobList") as HTMLDivElement
// grade nicht verwendet const fakultaet = document.getElementById("fakultaet") as HTMLSelectElement
const category = document.getElementById("kategorie") as HTMLSelectElement
const branche = document.getElementsByClassName("checkboxes") as HTMLCollectionOf<HTMLInputElement>


// Search Button
if (searchField !== null && searchForm !== null) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault()
    let postreq = false
    // todo: set the right id of categorys in html an save that value into variable
    let categoryVal = category.selectedIndex.toString()
    let brancheVal: string[] = new Array()
    for (var counter = 0; counter < 46; counter++) {
      if (branche.item(counter)?.checked) {
        brancheVal.push(branche.item(counter)?.getAttribute("value") as string)
      }
    }
    const query = searchField.value
    const radQuery = parseInt(radVal.value)

    console.log("category is now  :" + categoryVal + " and brancheVal is now  :" + brancheVal)
    if (categoryVal !== "0" || arrayContainsContent(brancheVal)) {
      postreq = true
    }
    if (postreq) {
      // if((document.getElementById("radSearch") as HTMLInputElement).checked == true){
      console.log("radiussearching... with post")
      atlas.radiusSearch(query, radQuery, postreq, categoryVal, brancheVal)

      // else{
      //   atlas.search(query,postreq,categoryVal,brancheVal)
      // }
    } else {
      // if((document.getElementById("radSearch") as HTMLInputElement).checked == true){
      console.log("radiussearching... no post ")
      atlas.radiusSearch(query, radQuery, postreq)
      // else{
      //   atlas.search(query,postreq)
      // }
    }
  })
}

// Geht im Moment noch nicht, Quelle muss Request erlauben. CORS Access-Control-Allow-Origin: https://atlas fehlt.
/*
 new Jobs().get().then( (jobs) => {
  globalStore.dispatch("setJobs", jobs)
})
Sample Creator 
let sample = new Sample()
sample.jobs(5000).then( (jobs)=>{
  atlas.setJobs(jobs)
})
*/
// Using local source .

new Jobs("https://raw.githubusercontent.com/Roma1790/atlasproj/roman/static/rawJobs.json").get().then((jobs) => {
  globalStore.dispatch("setJobs", jobs[0])              // Setzen der aktiven Jobs
  globalStore.dispatch("setJobLocationAll", jobs[1])    // Setzen aller Orte
  globalStore.dispatch("setJobLocation", jobs[1])       // Setzen aktiver Orte 
  showJobs(jobs[0])                                     // JobsAnzeige mit allen Jobs
  showJobsBig(jobs[0])  
})



/**
 * Displays a list of jobs under the map.
 *
 * @param jobs - The jobs the user clicked on.
 */
 const showJobs = (jobs: Job[]): void => {
  const ul = document.getElementById("jobs") as HTMLUListElement
  ul.innerHTML = ""
  jobs.forEach((job) => {
    const imagecontainer = document.createElement("div")
    const textcontainer = document.createElement("div")
    imagecontainer.setAttribute("class", "imageContainer")
    textcontainer.setAttribute("class", "textContainer")
    const item = document.createElement("li")
    const link = document.createElement("a")
    const image = document.createElement("img")
    const text = document.createElement("p")
    image.src = job.logo
    link.href = job.url
    link.innerText = "website"
    text.innerHTML = job.title
    imagecontainer.append(image)
    textcontainer.append(text)
    textcontainer.append(link)
    item.append(imagecontainer)
    item.append(textcontainer)
    ul.appendChild(item)
  })
}
/**
 * Displays a list of jobs instead of the map.
 *
 * @param jobs - The jobs the user clicked on.
 */
 const showJobsBig = (jobs: Job[]): void => {
  const ul = document.getElementById("jobsBig") as HTMLUListElement
 ul.innerHTML = ""
 jobs.forEach((job) => {
   const imagecontainer = document.createElement("div")
   const textcontainer = document.createElement("div")
   imagecontainer.setAttribute("class", "imageContainer")
   textcontainer.setAttribute("class", "textContainer")
   const item = document.createElement("li")
   const link = document.createElement("a")
   const image = document.createElement("img")
   const text = document.createElement("p")
   image.src = job.logo
   link.href = job.url
   link.innerText = "website"
   text.innerHTML = job.title
   imagecontainer.append(image)
   textcontainer.append(text)
   textcontainer.append(link)
   item.append(imagecontainer)
   item.append(textcontainer)
   ul.appendChild(item)
 })
}
// // will be the map and job switch
// MapSwitch.addEventListener("click", function (this: HTMLDivElement) {
  //   let bigDivMap = document.getElementById("map-container")
//   let bigDivJob = document.getElementById("jobsBig")
//   let smallDivJob = document.getElementById("jobs")
//   let smallDivMap = document.getElementById("map-containerSmall")
//   if(bigDivMap!.style.display == "block"){
  //     bigDivMap!.style.display = "none"
//     bigDivJob!.style.display = "block"
//     // smallDivJob!.style.display = "none"
//     // smallDivMap!.style.display = "block"
//     let visibleJobs = globalStore.getState().visibleJobs
//     showJobsBig(visibleJobs)
//   }
//   else{
//     bigDivJob!.style.display = "none"
//     bigDivMap!.style.display = "block"
//     // smallDivMap!.style.display = "none"
//     // smallbDivJob!.style.display = "block"
//     // let visibleJobs = globalStore.getState().visibleJobs
//     // showJobs(visibleJobs)
//   }
// })

MapSwitch?.addEventListener("click", () =>  {
  let bigDivMap = document.getElementById("map-container")
  let bigDivJob = document.getElementById("jobsBig")
  let smallDivJob = document.getElementById("jobs")
  let smallDivMap = document.getElementById("map-containerSmall")
  let visibleJobs = globalStore.getState().visibleJobs
  showJobsBig(visibleJobs)
  console.log("click1");
  
  if(smallDivJob!.style.display === "block"){
      smallDivJob!.style.display = "none"
      smallDivMap!.style.display = "block"
      bigDivMap!.style.display = "none"
      bigDivJob!.style.display = "block"
      console.log("click2");
    }
    else{
      smallDivMap!.style.display = "none"
      smallDivJob!.style.display = "block"
      bigDivJob!.style.display = "none"
      bigDivMap!.style.display = "block"

      console.log("click3");
    }
})
/**
 * Gets called when the user clicks on a cluster.
 *
 * Depending on our test setup we either zoom in and display jobs only if we cannot zoom in any further.
 * Or we zoom in and show always.
 *
 * @param atlas
 * @param jobs
 */
const handleClick = (atlas: Atlas, jobs: Job[], loc: RawLocation[]): void => {
  let visibleJobs = globalStore.getState().visibleJobs
  if (process.env.TEST_DISPLAY_ALWAYS === "true") {
    showJobs(jobs)
    showJobsBig(jobs)
  } 
  else {
    let coordinates: number[][] = []
      let lat, lon : number
      for(let j = 0; j < loc.length; j++){
        lon = parseFloat(loc[j].lng)
        lat = parseFloat(loc[j].lat)
        coordinates.push([lon,lat])
      }
    if (loc.length > 1) {
      // Zoom into Locations A Variante
      atlas.JobLayer.modifySelectorPoint(boundingExtent(coordinates))
      // atlas.zoomToBuildedExtent(coordinates)
      let jobs: Job[] = []
      for(let i = 0; i < loc.length ; i++){
        for(let j = 0; j < visibleJobs.length; j++){
          if(loc[i].IDs.indexOf(visibleJobs[j].id.toString()) != -1 ){
            jobs.push(visibleJobs[j])
          }
        }
      }
      showJobs(jobs)
    }
   else {
      // Show jobs of that location
      atlas.JobLayer.modifySelectorPoint(boundingExtent(coordinates))
      let jobids = loc[0].IDs
      let jobs: Job[] = []
      for(let i = 0; i < visibleJobs.length; i++){
        if(jobids.indexOf(visibleJobs[i].id.toString()) != -1 ){
          jobs.push(visibleJobs[i])
        }
      }
      showJobs(jobs)
      if(!loc[0].IDs.includes(",")){
        alert("pdf abbilden..")
      }
     
    }
  }
}


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

const clickedElementList: string[] = []

//visibility trigger of the branchSelector
branchSelector?.addEventListener("click", () => {
  let div = document.getElementById("KT_1_list")
  div!.style.display = div!.style.display == "none" ? "block" : "none"
})

// show the selected branches in the bar
checkbox.childNodes.forEach((child) => {
  if (child.nodeName === "INPUT") {
    child.addEventListener("click", () => {
      let element = child as HTMLInputElement
      let clickedElement = document.getElementById(element.id + "_label")!.innerText
      let button = <HTMLInputElement>document.getElementById("KT_1_button")
      let elementExists = false
      clickedElementList.forEach((element) => {
        if (element === clickedElement) {
          clickedElementList.splice(clickedElementList.indexOf(clickedElement), 1)
          elementExists = true
        }
      })
      if (!elementExists) {
        clickedElementList.push(clickedElement)
      }
      if (clickedElementList.length === 0) {
        button!.value = " Branche"
      } else {
        let count = 1
        button!.value = ' '
        clickedElementList.forEach((element) => {
          button.value += element
          if (count < clickedElementList.length) {
            button.value += ","
            count++
          }
        })
      }
    })
  }
})

//implement when more options are needed
// function more_options() {
//   let div = document.getElementById("more_options_div")
//   div!.style.display = div!.style.display == "none" ? "block" : "none"
// }

//filter to only allow numerical input
function setInputFilter(textbox: any, inputFilter: any) {
  ;["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop"].forEach(function (event) {
    textbox.addEventListener(event, function (this: any) {
      if (inputFilter(this.value)) {
        this.oldValue = this.value
        this.oldSelectionStart = this.selectionStart
        this.oldSelectionEnd = this.selectionEnd
      } else if (this.hasOwnProperty("oldValue")) {
        this.value = this.oldValue
        this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd)
      } else {
        this.value = ""
      }
    })
  })
}
window.addEventListener("click",function (this: HTMLDivElement) {
    let div = document.getElementById("KT_1_list")
    div!.style.display = "none"
})
// do things after the DOM loads fully
window.addEventListener("load", function () {
  setInputFilter(document.getElementById("radVal"), function (value: any) {
    return /^\d*$/.test(value)
  })
})