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
require('./../css/style.css');

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
const handleClick = (atlas: Atlas, jobs: Job[], loc: RawLocation[]): void => {
  // Setselectedcluster? dafür dann kann man cluster selecten und diesen überprüfen, ob er größer ist als 1. 
  // filter jobs aus der Raw Location und zeige sie . let jobs = loc.filterjobs
  let visibleJobs = globalStore.getState().visibleJobs
  if (process.env.TEST_DISPLAY_ALWAYS === "true") {
    showJobs(jobs)
  } 
  else {
    if (loc.length > 1) {
      // Zoom into Locations
      let coordinates: number[][] = []
      let lat, lon : number
      for(let j = 0; j < loc.length; j++){
        lon = parseFloat(loc[j].lng)
        lat = parseFloat(loc[j].lat)
        coordinates.push([lon,lat])
      }
      atlas.zoomToBuildedExtent(coordinates)
    }
   else {
      // Show jobs of that location
      let jobids = loc[0].IDs
      let jobs: Job[] = []
      for(let i = 0; i < visibleJobs.length; i++){
        if(jobids.indexOf(visibleJobs[i].id.toString()) != -1 ){
          jobs.push(visibleJobs[i])
        }
      }
      showJobs(jobs)
    }
  }
}

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


// Get Elements of HTML
const searchField = document.getElementById("searchField") as HTMLInputElement
const radVal = document.getElementById("radVal") as HTMLInputElement
const searchForm = document.getElementById("searchForm")
const resetbutton = document.getElementById("resetter")
const branchSelector = document.getElementById("KT_1_button")
const checkbox = document.getElementById("KT_1_list") as HTMLDivElement
// grade nicht verwendet const fakultaet = document.getElementById("fakultaet") as HTMLSelectElement
const category = document.getElementById("kategorie") as HTMLSelectElement
const branche = document.getElementsByClassName("checkboxes") as HTMLCollectionOf<HTMLInputElement>

// ResetterButton
resetbutton!.addEventListener("click", () => {
  globalStore.dispatch("setVisibleJobs", globalStore.getState().allJobs)
  globalStore.dispatch("setSelectedGeometries", [])
  // Request for Jobs again...
  new Jobs("https://raw.githubusercontent.com/chronark/atlas/master/static/rawJobs.json").get().then((jobs) => {
    globalStore.dispatch("setJobs", jobs)
  })
  // remove Circle Layer
  const allLayers = atlas.map.getLayers()
  allLayers.forEach((layer) => {
    if (layer.get("name") == "radiusCircle") {
      atlas.map.removeLayer(layer)
    }
  })
  // Zoom to Center
  atlas.zoomTo([0, 0], 0)
})
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
let orte: RawLocation[] = [
  {
    "IDs": "662064,663749,662607,661660,659667,657119,656765,656655,655940,655668,653604",
    "lat": "48.127594000000002",
    "lng": "11.612283",
    "titel": "Intern (m/f/d) System development for antenna measurement systems\n\nMaster Thesis (m/f/d) Deep Reinforcement Learning Based Cognitive Mobile Ad Hoc Networks\nIntern (m/f/d) EMC Software Development\nPraktikant (m/w/d) im Bereich elektrische Entwicklung\n\nPraktikant (m/w/d) in der Entwicklung von Cloud-basierten Testsystemen\nIntern (m/f/d) for Wireless Coexistence System Development\n\n\nPraktikant (m/w/d) Softwarebasierte Bildauswertung",
    "jobs": [0, 113, 279, 359, 460, 605, 610, 619, 634, 640, 702],
    "weight": 11
  },
  {
    "IDs": "661848",
    "lat": "48.876456599999997",
    "lng": "10.7185281",
    "titel": "Projektleitung Digitalisierung (m/w/d)",
    "jobs": [1],
    "weight": 1
  },
  {
    "IDs": "664278,663852",
    "lat": "47.809489999999997",
    "lng": "13.055009999999999",
    "titel": "Art Director\nCOVID-19 Journalismus Praktikum (m/w/d)",
    "jobs": [2, 78],
    "weight": 2
  },
  {
    "IDs": "664315,663949,663948,663965,663964,663947,663946,663945,663868,663867,663866,663864,663865,663863,663839",
    "lat": "48.677324499999997",
    "lng": "10.814128500000001",
    "titel": "\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
    "jobs": [3, 53, 58, 63, 79, 80, 81, 82, 84, 85, 86, 87, 92, 93, 94],
    "weight": 15
  },
  {
    "IDs": "664272,660327,660328",
    "lat": "48.877733300000003",
    "lng": "12.580153899999999",
    "titel": "\nMaster's Thesis: Machine Learning for Sales Prediction of an Online Trader\nBachelor's or Master's Thesis: Statistical Analysis of Sales of an Online Trader",
    "jobs": [4, 386, 387],
    "weight": 3
  },
  { "IDs": "664084", "lat": "48.268661700000003", "lng": "11.6650793", "titel": "", "jobs": [5], "weight": 1 },
  {
    "IDs": "664277,653302,662343,660565,660056,659902,659901,658697,658381,657339,656668,654021,664290,664300,664225,664238,664266,664161,664162,664165,664166,664167,664168,664171,664172,664174,664175,664176,664177,664071,664072,664075,664076,664139,664140,664038,664039,663989,663892,663770,663802,663805,663644,663645,663735,663736,663530,663551,663552,663595,663597,663598,663408,663318,663319,663248,663143,663152,663113,663040,663054,663063,662982,662863,662890,662736,662737,662811,662844,662845,662684,662692,662720,662602,662616,662522,662527,662528,662530,662430,662431,662432,662433,662491,662492,662317,662159,662160,661891,661785,661600,660438,660439,660314,660315,660126,660127,660009,660010,659838,659676,659677,659007,659008,657826,657827,657778,657779,657780,657669,657548,657549,657191,657192,657102,656878,656879,656438,656007,654947,654575,654576,654385,653346,653347,653226,653227,652453,652454,652456,651468,651480,651481,651516,651517,651354,650860,650862,650863,650607,650204,643562,643563,640363,640364,640371,640372,640384,640385,639718,638823,637931,635090,634499,631601,627894,627463,623880,623881,618654,606071",
    "lat": "48.135125299999999",
    "lng": "11.5819805",
    "titel": "Praktikum HR Management/Personal (m/w/d)\nPraktikum - Online Marketing \n\nWerkstudent Tax (m/w/d), befristet\n\nWerkstudent Frontend-Entwicklung (m/w/d)\nJunior-Frontend-Entwickler (m/w/d)\n\nMaster or Bachelor Thesis Media Research\nInternship at Internations in Munich - Editorial Office Intern \n\n\nVersicherungssachbearbeiter im Bereich Leben (m/w/d)\n\nIT-Sachbearbeiter (m/w/d)\nHead of Sales Digitale Plattform Automotive (m/w/d)\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nEntwickler (m/w/d) mathematischer Rechenkern Lebensversicherung\nEntwickler (m/w/d) mathematischer Rechenkern Lebensversicherung\n(Junior) Projektmanager (m/w/d)\n(Junior) Projektmanager (m/w/d)\n\n\nQuality Affairs Manager (m/w/d)\nSpezialist (m/w/d) IT-Sicherheit / Informationssicherheit\nEinrichtungsleitung (m/w/d)\nContent Manager (m/w/d)\nSAP Success Factors Berater (m/w/x)\n\n\n\n\n\n\n\nTrainee/Junior Account Manager, Marketing &amp; Kommunikation (m/w/d)\nProjektmanager (m/w/d) Textile Accessoires\nProjektmanager (m/w/d) Textile Accessoires\nSAP Anwendungsbetreuer (m/w/d)\nDipl.-Ingenieur bzw. Bachelor (m/w/d) der Fachrichtung Architektur oder Bauingenieurwesen\nDipl.-Ingenieur bzw. Bachelor (m/w/d) der Fachrichtung Architektur oder Bauingenieurwesen\nAccount Manager (w/m/d) - Workplace\nSenior Consultant (w/m/d) Controlling &amp; Finance - Schwerpunkt Planung &amp; Management Reporting\nData Scientist (m/w/d)*\nSAP Berater Job (m/w/x)\nExperte Digitalisierung / Systemadministrator (m/w/d)\nBackend Developer (w/m/d)\nSystemarchitekt Batteriesysteme (m/w/d)\n\n\n\nMitarbeiter*in Recruiting und Personalmanagement\n\nFrontend Developer (m/w/d)\n\n\n\n\nPhysiker in der Produktentwicklung (w/m/x)\n\nWebdesigner/UX-Designer (m/w/d)\n\nSachbearbeiter Bestandsdatenmanagement/Bereichscontrolling (m/w/d)\nSachbearbeiter Bestandsdatenmanagement/Bereichscontrolling (m/w/d)\nTechnische Sachbearbeiterin / Technischer Sachbearbeiter (w/m/d) Wartung\n\n\n\n\n\n\nDatabase Engineer (m/w/d)\n\n\nDatenanalyst (m/w/d)\n\n\n(Junior) Produktmanager (m/w/d) App / Web Bereich Fintech / Kontomanager\n(Junior) Produktmanager (m/w/d) App / Web Bereich Fintech / Kontomanager\n\n\n\n\nSpecialist Products - Digital Sales (m/w/d)\nEngineer Digital Sales (m/w/d)\n\n\n\n\n\n\n\nSystemingenieur Elektrotechnik (m/w/d)\nSystemingenieur Funktionale Sicherheit (m/w/d)\nSystemingenieur Funktionale Sicherheit (m/w/d)\nPresales Consultant (m/f/x) IoT Device Data Streaming\n\n\n\n\nConsultant Business Analytics - SAP IBP Developer (m/w/d)\n\n\n\n\n\n\n\nStellvertretende Einrichtungsleitung (m/w/d)\n\n\nMitarbeiter (m/w/d) Nachtdienst\nMitarbeiter (m/w/d) Nachtdienst\nSoftwareentwickler Java - Digital (m/w/d)\nSoftwareentwickler Java - Digital (m/w/d)\nDevOps Engineer (m/w/d)\n\nErzieher (m/w/d) als Gruppenleitung\nErzieher (m/w/d) als Gruppenleitung\n\n\n\nPersonalreferent (m/w/d)\n\n\n\n\n\n\nMitarbeiter*in im Nachtdienst\nMitarbeiter*in im Nachtdienst\n\n\nNachtdienst (m/w)\nNachtdienst (m/w)\nErzieher (m/w/d)\nErzieher (m/w/d)  Kinderkrippe\n\n\n\nErzieher (m/w/d) als Gruppenleitung\n\nSprachfachkraft (m/w/d)\n\n\nErzieher (m/w/d)\n",
    "jobs": [
      6,
      89,
      297,
      373,
      409,
      424,
      425,
      497,
      526,
      574,
      611,
      677,
      774,
      783,
      835,
      848,
      874,
      882,
      883,
      886,
      887,
      888,
      889,
      892,
      893,
      895,
      896,
      897,
      898,
      905,
      906,
      909,
      910,
      958,
      959,
      977,
      978,
      1026,
      1084,
      1128,
      1159,
      1162,
      1189,
      1190,
      1237,
      1238,
      1254,
      1262,
      1263,
      1293,
      1295,
      1296,
      1394,
      1443,
      1444,
      1483,
      1543,
      1552,
      1579,
      1601,
      1611,
      1617,
      1664,
      1703,
      1720,
      1736,
      1737,
      1770,
      1788,
      1789,
      1824,
      1829,
      1850,
      1857,
      1865,
      1882,
      1884,
      1885,
      1887,
      1901,
      1902,
      1903,
      1904,
      1918,
      1919,
      1951,
      2003,
      2004,
      2066,
      2085,
      2127,
      2190,
      2191,
      2221,
      2222,
      2226,
      2227,
      2269,
      2270,
      2288,
      2335,
      2336,
      2386,
      2387,
      2431,
      2432,
      2448,
      2449,
      2450,
      2454,
      2457,
      2458,
      2476,
      2477,
      2479,
      2484,
      2485,
      2494,
      2503,
      2509,
      2514,
      2515,
      2518,
      2534,
      2535,
      2536,
      2537,
      2554,
      2555,
      2556,
      2566,
      2567,
      2568,
      2569,
      2570,
      2571,
      2572,
      2574,
      2575,
      2576,
      2578,
      2631,
      2632,
      2640,
      2641,
      2642,
      2643,
      2645,
      2646,
      2647,
      2648,
      2649,
      2658,
      2659,
      2660,
      2662,
      2663,
      2664,
      2665,
      2667,
      2668
    ],
    "weight": 161
  },
  {
    "IDs": "664275",
    "lat": "48.839513400000001",
    "lng": "12.1832583",
    "titel": "Bachelor- / Masterarbeit Software",
    "jobs": [7],
    "weight": 1
  },
  {
    "IDs": "664274",
    "lat": "48.730267400000002",
    "lng": "11.188769300000001",
    "titel": "Werkstudenten (m/w/d) ",
    "jobs": [8],
    "weight": 1
  },
  {
    "IDs": "664127,663967,663956,662765,662501,662206,661693,660243,659842,659321,658367,658366,657242,657164,664202,664203,664247,664154,663882,663920,663921,663596,663603,663509,663510,663528,663414,663117,663118,663021,662966,662577,662436,662232,661689,661740,662132,659896",
    "lat": "49.452101800000001",
    "lng": "11.0766654",
    "titel": "Neuakquise von Kunden direkt vor Ort\n\nStudentische Hilfskraft (m/w/d)  Technologie-Marketing im Bereich 5G\n\nService- und Inbetriebnahmeingenieur m/w/d\nArchitekt (w/m/d) Schwerpunkt LPH 1 - 4 und 5\nAbschlussarbeit im Bereich Entwicklung - Automatisierung\nBauingenieur (m/w/d) im Verkehrswegebau\nWerkstudent IT / Software Engineering (m/w/d)\nPraktikum HR Online und Social Media Marketing\nGenug von der Turingmaschine? - Bei uns gibt's Praxis! (Werkstudent (m/w) - Softwareentwicklung)\n\nPraktikum (m/w/d) Projektentwickler Immobilien\nBachelor/ Master oder Dipl. Ing. Bau/ Holzbau (m/w/d)\nHochschulabsolvent (m/w/d) Sales/Vertriebsinnendienst\nHochschulabsolvent (m/w/d) Sales/Vertriebsinnendienst\n\n\nConsultant IT-Security (m/w/d)\nSales and Retention Specialist (m/w/d)\nSales and Retention Specialist (m/w/d)\n\nApplication Support Engineer / Softwareentwickler (m/w/d) Application Automation\nJava-Backend-Entwickler (m/w/d)\nBig Data DevOps Engineer (m/w/d)\nJava-Entwickler (m/w/d) Investment Solutions\nProjektingenieur/-techniker Elektrokonstruktion (m/w/d)\nIT-Techniker (w/m/d)\nIT-Techniker (w/m/d)\nIT-Trainee (w/m/d)\nSAP ABAP Entwickler (m/w/d)\n\nBusiness Analyst (m/w/d) BI / Reporting - FATCA / CRS\nIT-Berater SAP Finance (m/w/d)\nIT Solution Engineer - E-Commerce und Product Information Management (PIM) (m/w/d)\nSpezialist (m/w/d) Business Intelligence / SAS-Administration\nBerater Performance Improvement (m/w/d)\nBerater Data &amp; Analytics Architecture (m/w/d)",
    "jobs": [
      9,
      62,
      65,
      252,
      284,
      303,
      351,
      389,
      427,
      468,
      528,
      529,
      592,
      593,
      824,
      825,
      857,
      969,
      1075,
      1105,
      1106,
      1294,
      1299,
      1355,
      1356,
      1368,
      1400,
      1582,
      1583,
      1589,
      1650,
      1894,
      1905,
      1973,
      2102,
      2117,
      2223,
      2304
    ],
    "weight": 38
  },
  {
    "IDs": "664212",
    "lat": "49.414050000000003",
    "lng": "11.16398",
    "titel": "Praktikantenstelle",
    "jobs": [10],
    "weight": 1
  },
  {
    "IDs": "664198,661678,659845,659844,659843",
    "lat": "49.547440100000003",
    "lng": "11.019914699999999",
    "titel": "\nStudentische Hilfskraft (m/w/d) zur Datenbankpflege in der Gruppe Unternehmenskommunikation\nMaster Thesis Students for simulative evaluation \n\n",
    "jobs": [11, 357, 429, 430, 431],
    "weight": 5
  },
  {
    "IDs": "664185",
    "lat": "48.159861999999997",
    "lng": "11.56925",
    "titel": "Wirtschaftsingenieur: Abschlussarbeit (m|w|d)",
    "jobs": [12],
    "weight": 1
  },
  {
    "IDs": "664183,662240,659111,658907,653303,659611",
    "lat": "47.728569899999997",
    "lng": "10.3157835",
    "titel": "Architekt (m/w/d)\nTRAINEE (M/W/D) VERTRIEB\nDesign und Verifizierung eines automatischen Bildverarbeitungsalgorithmus zur Messdatenverarbeitung \n\nWerkstudent - Immobilienvermarktung Projektentwicklung / Marketing / BWL\nSAP HCM Berater (m/w/x)",
    "jobs": [13, 302, 486, 493, 569, 2354],
    "weight": 6
  },
  {
    "IDs": "657041,657042,659937,662207,662208",
    "lat": "48.780607099999997",
    "lng": "12.8690362",
    "titel": "Abschlussarbeit &quot;Integrierte IoT-Architekturen mit Microsoft Azure und SAP ERP&quot;\nAbschlussarbeit Initiativ\nAbschlussarbeit &quot;Konzeption eines generischen Formelgenerators&quot;\nAbschlussarbeit &quot;Integration von SAP und Microsoft 365&quot;\n",
    "jobs": [14, 15, 16, 17, 18],
    "weight": 5
  },
  {
    "IDs": "664194,664193,663941,663939",
    "lat": "49.448468400000003",
    "lng": "11.091822000000001",
    "titel": "\n\n\n",
    "jobs": [19, 20, 70, 71],
    "weight": 4
  },
  {
    "IDs": "664182,664181,664179",
    "lat": "49.544249999999998",
    "lng": "10.987349999999999",
    "titel": "Praktikum im Bereich Strategische Vertriebsentwicklung (m/w/d)\n\n",
    "jobs": [21, 22, 23],
    "weight": 3
  },
  {
    "IDs": "664192,664188,664187,664186,663963,663991,663862,663966,663752,663447,663374,663239,663218,663223,663222,663199,663090,662923",
    "lat": "48.188839999999999",
    "lng": "11.647460000000001",
    "titel": "\nPraktikum Gestaltung Kundenprozesse (m/w/d)\nPraktikum Marktmanagement (m/w/d)\nPraktikant (m/w/d) im Team Innovation\n\nWerkstudent im Business Management (m/w/d)\nPraktikant (m/w/d) im Bereich Business Intelligence / Datenbereitstellung / Datenanalyss (6 Monate)\nPraktikum als Mathematiker im Bereich Finanzen und Aktuariat (m/w/d)\n\n\nPraktikant/Werkstudent Produktgestaltung (m/w/d)\nPraktikant Bereich Marktmanagement, Referat Werbung (m/w/d)\n\nWerkstudent in HR Operations@APAS (m/w/d)\nWerkstudent Business &amp; IT Transformation in einem agilen Scrum-Team (m/w/d)\n\n\nWerkstudent HR (m/w/d)",
    "jobs": [24, 28, 29, 30, 52, 59, 60, 74, 112, 162, 177, 194, 202, 204, 205, 206, 220, 236],
    "weight": 18
  },
  {
    "IDs": "664191,664190,664189",
    "lat": "48.154794600000002",
    "lng": "11.5886674",
    "titel": "\nPraktikant / Werkstudent (m/w/d) bei unserem Onlineversicherer Allianz Direct\nWerkstudent oder Praktikant (m/w/d) beim Onlineversicherer Allianz Direct",
    "jobs": [25, 26, 27],
    "weight": 3
  },
  {
    "IDs": "663165",
    "lat": "49.7696082",
    "lng": "9.8669790000000006",
    "titel": "Praxissemester Praktikant Wirtschaftswissenschaften / Wirtschaftsingenieur (m/w/d) ",
    "jobs": [31],
    "weight": 1
  },
  {
    "IDs": "656377,659184",
    "lat": "47.883017500000001",
    "lng": "10.625966",
    "titel": "\nPraktikant im Spezialtiefbau (m/w/d)",
    "jobs": [32, 483],
    "weight": 2
  },
  {
    "IDs": "664130,659847",
    "lat": "48.626644300000002",
    "lng": "11.779087499999999",
    "titel": "Produktmanager Regelung &amp; digitale Tools (m/w/d)\nPraktikant (m/w/d) im Bereich Produktmanagement",
    "jobs": [33, 421],
    "weight": 2
  },
  {
    "IDs": "664129,664128",
    "lat": "48.148871999999997",
    "lng": "10.2398887",
    "titel": "Praxissemester oder Abschlussarbeit  im Bereich IT\nPraxissemester oder Abschlussarbeit  im Bereich Business Intelligence ",
    "jobs": [34, 35],
    "weight": 2
  },
  {
    "IDs": "664086",
    "lat": "49.001209899999999",
    "lng": "8.4685620000000004",
    "titel": "Kostenanalyse von Bezahlmethoden und Zahlungsanbietern im B2B Commerce",
    "jobs": [36],
    "weight": 1
  },
  {
    "IDs": "664085,664063,663744,662917,662922,662590,662498,662451,662192",
    "lat": "48.234180000000002",
    "lng": "8.4187999999999992",
    "titel": "Praktikum oder Abschlussarbeit im Bereich Lean Production / Logistik\nAbschlussarbeit im Bereich Software Entwicklung\nAbschlussarbeit im Bereich Data Science / Machine Learning\n\n\nAbschlussarbeit im Bereich Optiksysteme Konstruktion / Simulation\nPraktikum oder Abschlussarbeit im Bereich R&amp;D Mikroapplikation: Grundlagenentwicklung Strahlformung\nPraktikum oder Abschlussarbeit im Bereich Produktion\nAbschlussarbeit im Bereich Forschung und Entwicklung",
    "jobs": [37, 45, 116, 239, 240, 281, 286, 287, 308],
    "weight": 9
  },
  {
    "IDs": "664064",
    "lat": "49.414400000000001",
    "lng": "12.00089",
    "titel": "Fotograf (m/w/d)",
    "jobs": [38],
    "weight": 1
  },
  {
    "IDs": "653503,657248",
    "lat": "48.104179999999999",
    "lng": "11.60013",
    "titel": "Softwareingenieur*in\nBachelor- und Master-Thesen in IT-Projekthaus",
    "jobs": [39, 40],
    "weight": 2
  },
  {
    "IDs": "652162,652159,652156",
    "lat": "47.976509999999998",
    "lng": "10.1827834",
    "titel": "Praktikanten in der Bauleitung (m/w/d) \n\nBachelor-/Masterarbeit Bauingenieurwesen",
    "jobs": [41, 42, 43],
    "weight": 3
  },
  { "IDs": "662920", "lat": "49.970334899999997", "lng": "10.726879", "titel": "", "jobs": [44], "weight": 1 },
  {
    "IDs": "664061",
    "lat": "47.7208708",
    "lng": "10.313981399999999",
    "titel": "Praktikant(w/m/d) im Regionalmanagement",
    "jobs": [46],
    "weight": 1
  },
  {
    "IDs": "664028,664027",
    "lat": "47.4093339",
    "lng": "8.5448754000000005",
    "titel": "Hardware / Electronics Design Internship\nDrone / Robotics Mechatronics Development Internship",
    "jobs": [47, 48],
    "weight": 2
  },
  {
    "IDs": "664026,664025",
    "lat": "48.557943000000002",
    "lng": "10.642869900000001",
    "titel": "CAD-Konstrukteur (m/w/d)\nSEMA-Konstrukteur (m/w/d)",
    "jobs": [49, 50],
    "weight": 2
  },
  {
    "IDs": "664022,658421,658419",
    "lat": "48.327800799999999",
    "lng": "10.897324100000001",
    "titel": "\n\n",
    "jobs": [51, 520, 521],
    "weight": 3
  },
  {
    "IDs": "664020,660055,660054,660052",
    "lat": "48.1743819",
    "lng": "11.533678200000001",
    "titel": "Werkstudent (w/m/d) EMBEDDED HARDWARE &amp; SOFTWARE ENGINEERING\nPraktisches Studiensemester im Bereich Produkt und Key Account Management (w/m/d)\nWerkstudent/in mit Schwerpunkt Produkt und Key Account Management (w/m/d)\nPraktikant/in mit Schwerpunkt Produkt und Key Account Management (w/m/d) ",
    "jobs": [54, 413, 414, 415],
    "weight": 4
  },
  {
    "IDs": "664019,662046",
    "lat": "49.561396799999997",
    "lng": "11.004377099999999",
    "titel": "\nMaster Thesis Students, Topic: Design Space Exploration of Neural Network Hardware Architectures",
    "jobs": [55, 319],
    "weight": 2
  },
  {
    "IDs": "664017",
    "lat": "48.175412700000003",
    "lng": "11.589445899999999",
    "titel": "Werkstudent Real Estate (m|w|d)",
    "jobs": [56],
    "weight": 1
  },
  {
    "IDs": "663755",
    "lat": "49.475220999999998",
    "lng": "11.0632085",
    "titel": "Bauleiter (m/w/d)",
    "jobs": [57],
    "weight": 1
  },
  {
    "IDs": "663968",
    "lat": "49.593364800000003",
    "lng": "11.0081241",
    "titel": "Werkstudent/studentische Hilfskraft (m/w/d) zur Mitarbeit in Kanzlei gesucht",
    "jobs": [61],
    "weight": 1
  },
  {
    "IDs": "663957",
    "lat": "49.403684699999999",
    "lng": "11.053666700000001",
    "titel": "Masterarbeit im Bereich Logistik / Umweltmanagement",
    "jobs": [64],
    "weight": 1
  },
  {
    "IDs": "663940",
    "lat": "48.794416699999999",
    "lng": "12.642410399999999",
    "titel": "Bachelor Fachrichtung Architektur Hochbau (w/m/d)",
    "jobs": [66],
    "weight": 1
  },
  {
    "IDs": "663935,654132",
    "lat": "50.524085300000003",
    "lng": "7.4892545000000004",
    "titel": "Abschlussarbeit (Bachelor/Master) Nachhaltigkeitsbewertung in der Entwicklung von Digitaldrucktinten\nSmarte Tinten / Nachhaltige Additive / Digitaldrucktinten",
    "jobs": [67, 88],
    "weight": 2
  },
  {
    "IDs": "663751,663491,663490,662026,659316",
    "lat": "49.898813500000003",
    "lng": "10.9027636",
    "titel": "Werkstudent (m/w/d) Kommunikation &amp; Marketing \nAbsolvent (-in) Architektur / Bauingenieurswesen\nStudent (in) Architektur / Bauingenieurwesen\nProduktmanager (m/w/d) Steckbare Elektroinstallation\nSAP SD / MM Berater (m/w/x)",
    "jobs": [68, 160, 161, 2036, 2367],
    "weight": 5
  },
  {
    "IDs": "663538",
    "lat": "48.890823400000002",
    "lng": "2.2858426999999999",
    "titel": "Internship Junior Community- &amp; Influencer-Manager",
    "jobs": [69],
    "weight": 1
  },
  {
    "IDs": "663938,663937",
    "lat": "48.237252699999999",
    "lng": "12.5462548",
    "titel": "Abschlussarbeit IT - SAP \nAbschlussarbeit Einkauf ",
    "jobs": [72, 73],
    "weight": 2
  },
  { "IDs": "663905", "lat": "52.503034999999997", "lng": "13.3368161", "titel": "", "jobs": [75], "weight": 1 },
  {
    "IDs": "663904,663861,662677",
    "lat": "49.490474200000001",
    "lng": "11.098683400000001",
    "titel": "\nPraktikantin/Praktikant (w/m/d) im Bereich Data Analytics, Simulation und Optimierung\nScrum Master (m/w/d)",
    "jobs": [76, 77, 1818],
    "weight": 3
  },
  {
    "IDs": "663845,662058",
    "lat": "50.044487799999999",
    "lng": "10.225839799999999",
    "titel": "\nIngenieur (m/w/d) der Elektrotechnik, Elektrokonstruktion, Produktionsmaschinen und -anlagen",
    "jobs": [83, 2042],
    "weight": 2
  },
  {
    "IDs": "663829",
    "lat": "35.861660000000001",
    "lng": "104.195397",
    "titel": "Industrial (electronic) Design Internship in Shanghai, China",
    "jobs": [90],
    "weight": 1
  },
  {
    "IDs": "663827",
    "lat": "-8.3405389000000003",
    "lng": "115.0919509",
    "titel": "Marketing &amp; Business Internship in Bali Island, Indonesia",
    "jobs": [91],
    "weight": 1
  },
  {
    "IDs": "663747,662200",
    "lat": "48.8827973",
    "lng": "12.788983699999999",
    "titel": "Verbundstudium Maschinenbau mit Ausbildung zum Technischen Produktdesigner (m/w/d)\nPraktikant Controlling (m/w/d)",
    "jobs": [95, 307],
    "weight": 2
  },
  {
    "IDs": "663711,658748,664200,664201,663918,662976,660212,660217,649380",
    "lat": "48.401082199999998",
    "lng": "9.9876076000000005",
    "titel": "Nebenjob: Vertriebsmitarbeiter\nPraktikanten/Werkstudenten (m/w/d)\nPersonalberater / -disponent (m/w/d) im Sozialwesen\nPersonalberater / -disponent (m/w/d) im Sozialwesen\nProjektleiter (m/w/d) Batteriezellproduktion\nGebietsverkaufsleiter (m/w/d)\nOnline Category Manager (m/w/d)\n2nd Level Support Manager (m/w/d) E-Commerce\nWeb- und Cloud Entwickler (m/w/d)",
    "jobs": [96, 495, 822, 823, 1103, 1658, 2244, 2245, 2605],
    "weight": 9
  },
  {
    "IDs": "663850,663849,663998,663999,663405,663249,662785,652166",
    "lat": "48.191662299999997",
    "lng": "11.646044099999999",
    "titel": "Werkstudent Vertriebsassistenz (m/w/d)\nWerkstudent Einkauf (m/w/d)\nJunior Editor / Redakteur (m/w/d)\nJunior Editor / Redakteur (m/w/d)\n\nBusiness Analyst Business Process &amp; IT-Transformation (m/w/d)\nBusiness Analyst (m/w/d) in Business Process &amp; IT-Transformation (D-BITKIS-KL)\n",
    "jobs": [97, 98, 1033, 1034, 1391, 1484, 1758, 2560],
    "weight": 8
  },
  {
    "IDs": "663843,663844,663851",
    "lat": "48.552241700000003",
    "lng": "12.188184100000001",
    "titel": "Abschlussarbeiten Elektro- u. Automatisierungstechnik (m/w/d)\nPraktikum Elektro- u. Automatisierungstechnik (m/w/d)\nAbschlussarbeiten Maschinenbau - Konstruktion (m/w/d)",
    "jobs": [99, 100, 101],
    "weight": 3
  },
  {
    "IDs": "663842",
    "lat": "49.293479599999998",
    "lng": "10.5548436",
    "titel": "Praktikant (m/w/d) Personalmarketing ",
    "jobs": [102],
    "weight": 1
  },
  {
    "IDs": "663840,663838",
    "lat": "49.532350899999997",
    "lng": "11.1540547",
    "titel": "\nPraktikant (m/w/d) in der Software Prototypen Entwicklung mit Unity Game Engine ",
    "jobs": [103, 104],
    "weight": 2
  },
  {
    "IDs": "663660,663383,663382",
    "lat": "48.091532399999998",
    "lng": "11.283371900000001",
    "titel": "Abschlussarbeit Personal- und Organisationsentwicklung (m/w/d)\n\n",
    "jobs": [105, 174, 175],
    "weight": 3
  },
  {
    "IDs": "657805",
    "lat": "49.787149700000001",
    "lng": "9.8385753999999999",
    "titel": "",
    "jobs": [106],
    "weight": 1
  },
  {
    "IDs": "663758,663219,657364,657336,656523,663723,663724",
    "lat": "48.544191699999999",
    "lng": "12.146853200000001",
    "titel": "\nBachelor-/Masterarbeit zur quantitativen Bewertung von Klimaauswirkungen in kommunalen Beschlussvorl\n\nHuman Resources Praktikum bei Walter-Fach-Kraft\nBauingenieur (m/w/d) Wasserbau\nIngenieur (w/m/d) im Bereich technischer Umweltschutz\nIngenieur (w/m/d) im Bereich technischer Umweltschutz",
    "jobs": [107, 199, 572, 577, 629, 1226, 1227],
    "weight": 7
  },
  {
    "IDs": "663627,663622",
    "lat": "48.193283399999999",
    "lng": "11.375207700000001",
    "titel": "\n",
    "jobs": [108, 109],
    "weight": 2
  },
  {
    "IDs": "663609",
    "lat": "36.721178399999999",
    "lng": "-4.4217199000000003",
    "titel": "Spanish - Technical Management Assistant in an insurance company in Malaga, Spain",
    "jobs": [110],
    "weight": 1
  },
  {
    "IDs": "663756,659620",
    "lat": "49.427590000000002",
    "lng": "11.01829",
    "titel": "Junior Expert (m/w/d) Governance &amp; Information Security \nWerkstudent (m/w/d) Softwareentwicklung",
    "jobs": [111, 463],
    "weight": 2
  },
  {
    "IDs": "663748,659562,659596",
    "lat": "49.4909046",
    "lng": "11.1043938",
    "titel": "Werkstudent IT-Administration (m/w/d)\nTestingenieur im Bereich Hardware (m/w/d)\nJunior Softwareentwickler (m/w/d)",
    "jobs": [114, 119, 120],
    "weight": 3
  },
  {
    "IDs": "663559",
    "lat": "49.263324500000003",
    "lng": "11.461702600000001",
    "titel": "WERKSTUDENT (M/W/D) im Bereich Einkauf",
    "jobs": [115],
    "weight": 1
  },
  {
    "IDs": "663683",
    "lat": "49.429226800000002",
    "lng": "11.0588666",
    "titel": "Werkstudent (m/w/d) 20 Stunden/Woche im Bereich Finanzen und Controlling",
    "jobs": [117],
    "weight": 1
  },
  {
    "IDs": "663658,652149",
    "lat": "49.481119999999997",
    "lng": "11.05972",
    "titel": "Produktmanager/in Display\n",
    "jobs": [118, 750],
    "weight": 2
  },
  {
    "IDs": "661763,661764",
    "lat": "49.490726600000002",
    "lng": "11.1044953",
    "titel": "Werkstudent Softwareentwicklung (m/w/d)\nWerkstudent Hardwareentwicklung (m/w/d)",
    "jobs": [121, 122],
    "weight": 2
  },
  {
    "IDs": "663625",
    "lat": "48.122048200000002",
    "lng": "11.5889603",
    "titel": "Praktikant oder Werkstudent PHP / Symfony *",
    "jobs": [123],
    "weight": 1
  },
  {
    "IDs": "663692,663691,663690,663689,663688,663687,663686,663685,663684,663682,663681,663680,663679,663678,663676,663672,663670,663675,663674,663663,663677,663665",
    "lat": "48.472490000000001",
    "lng": "11.94153",
    "titel": "\n\n\n\nPraktikum/Abschlussarbeit im Technischen Einkauf (SS 21)\nPraktikant (m/w/d) im Strategischen Einkauf (SS 21)\n\nPraktikant (m/w/d) im Bereich Arbeitssicherheit/ Umweltschutz/ Energiemanagement (SS 21)\nPraktikant (m/w/d) im Bereich Personalwesen (SS 21)\nPraktikant (m/w/d) im Bereich Berechnung und Simulation (SS 21)\n\nPraktikant (m/w/d) im Bereich Konstruktion Gegengewichtstapler (SS 21)\nPraktikant (m/w/d) im Bereich Versuch und Prototypenbau (SS 21)\nPraktikant (m/w/d) im Bereich Entwicklung / Konstruktion Elektromotorische Stapler (SS 21)\nPraktikant (m/w/d) im Bereich Produktmanagement Gegengewichtstapler (SS 21)\nPraktikant (m/w/d) im Bereich Produktionsanlagen (SS 21)\nPraktikant (m/w/d) im Bereich Logistikplanung (SS 21)\n\nPraktikant (m/w/d) im Bereich Lean Production / Produktionssysteme (SS 21)\nPraktikant (m/w/d) im Bereich Industrial Engineering Gegengewichtstapler (SS 21)\nPraktikant (m/w/d) im Bereich technische Sonderanfragen/ Customization (SS 21)\nPraktikant (m/w/d) im Bereich Industrial Engineering Fertigung/Farbgebung (SS 21)",
    "jobs": [
      124,
      125,
      126,
      127,
      128,
      129,
      130,
      131,
      132,
      133,
      134,
      135,
      136,
      137,
      138,
      139,
      140,
      141,
      142,
      143,
      144,
      145
    ],
    "weight": 22
  },
  {
    "IDs": "663624",
    "lat": "48.352111999999998",
    "lng": "10.8806739",
    "titel": "Bauingenieur oder Architekt (m/w/d) als Projektmanager",
    "jobs": [146],
    "weight": 1
  },
  {
    "IDs": "663623",
    "lat": "47.870816099999999",
    "lng": "13.548064200000001",
    "titel": "Covid-19 Journalismus Praktikum (m/w/d)",
    "jobs": [147],
    "weight": 1
  },
  {
    "IDs": "663620",
    "lat": "48.892580000000002",
    "lng": "11.186",
    "titel": "Bauingenieur (w/m/d) Bereich Konstruktiver Hochbau",
    "jobs": [148],
    "weight": 1
  },
  {
    "IDs": "663607,663086,662918",
    "lat": "48.245049999999999",
    "lng": "9.8723799999999997",
    "titel": "Praxissemester Projekt- und Changemanagement (m/w/d)\nPraxissemester Arbeitsvorbereitung (m/w/d)\nPraktikant (m/w/d) im Marketing",
    "jobs": [149, 227, 238],
    "weight": 3
  },
  {
    "IDs": "663606",
    "lat": "49.300319999999999",
    "lng": "10.589309999999999",
    "titel": "Werkstudent/Aushilfe in Teilzeit (m/w/d)",
    "jobs": [150],
    "weight": 1
  },
  {
    "IDs": "663584,663197",
    "lat": "48.768146399999999",
    "lng": "9.1584588999999994",
    "titel": "\n",
    "jobs": [151, 207],
    "weight": 2
  },
  {
    "IDs": "663562",
    "lat": "47.8720967",
    "lng": "11.688643600000001",
    "titel": "Diplomingenieur (FH) oder Bachelor (m/w/d) - Fachrichtung Architektur, Stadtplanung",
    "jobs": [152],
    "weight": 1
  },
  {
    "IDs": "663560,663454,663455",
    "lat": "49.023411799999998",
    "lng": "9.3224633000000008",
    "titel": "Werkstudent (m/w/d) Produktion / Arbeitsvorbereitung\n\n",
    "jobs": [153, 1309, 1310],
    "weight": 3
  },
  {
    "IDs": "663558",
    "lat": "49.385662099999998",
    "lng": "11.3564834",
    "titel": "Abgeschlossenen oder Dualen-Studenten (m/w/d) Business-Development &amp; Controlling",
    "jobs": [154],
    "weight": 1
  },
  {
    "IDs": "663535",
    "lat": "48.134752200000001",
    "lng": "11.5309366",
    "titel": "Communication Designer (w/m/d)",
    "jobs": [155],
    "weight": 1
  },
  {
    "IDs": "663534",
    "lat": "47.488790000000002",
    "lng": "10.71865",
    "titel": "Produktionsplaner/-steuerer (m/w/d)",
    "jobs": [156],
    "weight": 1
  },
  { "IDs": "663531", "lat": "48.179463300000002", "lng": "11.5320623", "titel": "", "jobs": [157], "weight": 1 },
  {
    "IDs": "663536,663537,659744",
    "lat": "49.4297161",
    "lng": "11.018590100000001",
    "titel": "Werkstudent (m/w/d) Placement/Artikelplatzierung\nWerkstudent (m/w/d) Artikelklassifizierung\nWerkstudent (m/w/d) Analytics /Business Insights in der Marktforschung",
    "jobs": [158, 159, 163],
    "weight": 3
  },
  {
    "IDs": "663446",
    "lat": "50.092804999999998",
    "lng": "9.6473986000000007",
    "titel": "",
    "jobs": [164],
    "weight": 1
  },
  {
    "IDs": "663449",
    "lat": "50.251735500000002",
    "lng": "11.3924784",
    "titel": "Bachelor- oder Masterarbeit Fachrichtung TGA, VT, ELT oder vergleichbarer Studiengang",
    "jobs": [165],
    "weight": 1
  },
  { "IDs": "663444", "lat": "49.017343799999999", "lng": "12.1181088", "titel": "", "jobs": [166], "weight": 1 },
  {
    "IDs": "663404,663243,662280,658699,658147,664328,664329,664268,663565,663566,662988,662993,662994,662996,662997,657751",
    "lat": "49.013429700000003",
    "lng": "12.1016236",
    "titel": "BWL-Student Bachelor internationale Betriebswirtschaft (w/m/d)\n\nBachelor- oder Masterarbeit im Bereich IT\n\nIT-Profi (m/w/d)\nEntwicklungsingenieur*in (d/m/w) - System- und Produktverifikation\nEntwicklungsingenieur*in (d/m/w) - System- und Produktverifikation\n\n\n\n\n\n\n\n\nFachplaner Versorgungstechnik (m/w/d)",
    "jobs": [167, 187, 305, 500, 530, 809, 810, 876, 1267, 1268, 1670, 1675, 1676, 1678, 1679, 2444],
    "weight": 16
  },
  { "IDs": "652184", "lat": "48.149938400000003", "lng": "11.5479237", "titel": "", "jobs": [168], "weight": 1 },
  {
    "IDs": "663435,662633",
    "lat": "48.220144400000002",
    "lng": "16.356164199999998",
    "titel": "Wissenschaftliche*r Projektmitarbeiter*in in der Forschungsgruppe Software Architecture ab 01/2021\nWissenschaftliche*r Projektmitarbeiter*in in der Forschungsgruppe Software Architecture",
    "jobs": [169, 183],
    "weight": 2
  },
  {
    "IDs": "663366,658800,662374,657916,653492,653493",
    "lat": "49.791304400000001",
    "lng": "9.9533547999999996",
    "titel": "Bachelor  - Master Elektrische Energietechnik oder Versorgungstechnik (HLS)\n\nSAP BW / BI Berater (m/w/x)\nSenior Software Engineer Marine iOS (m/w/d)\nEmbedded Software-Engineer Automotive OEM (m/w/d)\nEmbedded Software-Engineer Automotive OEM (m/w/d)",
    "jobs": [170, 494, 1928, 2425, 2531, 2532],
    "weight": 6
  },
  {
    "IDs": "663384",
    "lat": "49.497278000000001",
    "lng": "11.282556",
    "titel": "WERKSTUDENT RETAIL (M/W/D)",
    "jobs": [171],
    "weight": 1
  },
  {
    "IDs": "663380",
    "lat": "49.849089999999997",
    "lng": "9.9656400000000005",
    "titel": "Unity Programmierer / Fachinformatiker m/w/d",
    "jobs": [172],
    "weight": 1
  },
  {
    "IDs": "663375,660332,662128,660331",
    "lat": "49.544926400000001",
    "lng": "11.1490797",
    "titel": "Praktikant (m/w/d) zur Implementierung eines Chatbots\nPraktikum Produkt- und Industriedesign (m/w/d)\nPraktikum Global Events &amp; Design (m/w/d)\nPraktikum Sales Americas (m/w/d)",
    "jobs": [173, 253, 311, 384],
    "weight": 4
  },
  {
    "IDs": "663376,663453,663324,663349,663098,663069,662960,662961,662888,662889,662091,660517,660555,659426,659254,659005,658476,657961",
    "lat": "53.551084600000003",
    "lng": "9.9936819000000003",
    "titel": "\nObjektbetreuer/Objektbetreuerin (m/w/d)\nIT-Applikationsmanagerin bzw. IT-Applikationsmanager (m/w/d)\nJava Software Developer (m/f/d)\nSystemmanager (m/w/d) Spielsystem\nReferent_in Grundsatzfragen (m/w/d) Konzernrechnungslegung\nReact Entwicklerin (m/w/d)\nReact Entwicklerin (m/w/d)\nChemielaborant (m/w/d)\nChemielaborant (m/w/d)\nFachbetreuer (m/w/d) Kunden- und Akquisitionsmanagement\nSAP HCM Berater / Teilprojektleiter (m/w/x) mit Schwerpunkt PY &amp; PA\nInformatiker / Fachinformatiker als DevOps Engineer (m/w/d)\nSAP FIORI / UI5 Entwickler (m/w/x)\nFull Stack Entwickler (m/w/d)\nSAP HCM Berater (m/w/x) - SAP HCM Consultant (m/w/x) - SAP HCM Inhouse Position\nSAP ABAP / UI5 Entwickler (m/w/x)\nSAP BW / 4 HANA Berater (m/w/x)",
    "jobs": [
      176,
      1308,
      1448,
      1469,
      1568,
      1623,
      1645,
      1646,
      1718,
      1719,
      2022,
      2154,
      2158,
      2364,
      2375,
      2385,
      2416,
      2428
    ],
    "weight": 18
  },
  {
    "IDs": "663364",
    "lat": "48.1869716",
    "lng": "11.543797400000001",
    "titel": "Werkstudent (m/w/d) Softwareentwicklung",
    "jobs": [178],
    "weight": 1
  },
  {
    "IDs": "663373,663372",
    "lat": "48.076826199999999",
    "lng": "11.6372955",
    "titel": "Ingenieur/Informatiker als Wissenschaftlicher Mitarbeiter (m/w)\nIngenieur/Informatiker als Wissenschaftlicher Mitarbeiter (m/w)",
    "jobs": [179, 180],
    "weight": 2
  },
  {
    "IDs": "663371",
    "lat": "48.080296400000002",
    "lng": "11.6382008",
    "titel": "Ingenieur/Informatiker als Wissenschaftlicher Mitarbeiter (m/w)",
    "jobs": [181],
    "weight": 1
  },
  {
    "IDs": "629906,664045,663995,663790,663494,663370,663307,663270,662932,662865,662866,662519,662174,662111,660556,660446",
    "lat": "52.0302285",
    "lng": "8.5324708000000005",
    "titel": "Bachelor- und Masterarbeiten im IT-Bereich\nSystems Engineer - Microsoft Technology (m/w/d) OEDIV KG\nProfessional Supply Chain Controlling (m/w/d)\n(Junior) Firewall-Administrator (m/w/d)\n(Senior) Systems Engineer - Linux (m/w/d)\nMediengestalter/GTA Druckvorlagenhersteller (m/w/d)\nSystemadministrator VMware (m/w/d)\nMicrosoft Cloud Consultant (m/w/d)\nIT-Systemadministrator (w/m/d) Webserver im Linux-Umfeld\nIngenieurin / Ingenieur (w/m/d) der Elektrotechnik\nIngenieurin / Ingenieur (w/m/d) der Elektrotechnik\nSpezialist Kundenbetreuung (m/w/d) Immobilienverwaltung\nCompute &amp; Storage Engineer (m/w/d)\nProject Manager - SAP Basis (m/w/d)\n\nSupport Engineer - Windows (m/w/d)",
    "jobs": [182, 983, 1030, 1147, 1340, 1376, 1433, 1499, 1689, 1705, 1706, 1881, 2009, 2025, 2159, 2193],
    "weight": 16
  },
  { "IDs": "663291", "lat": "49.413468999999999", "lng": "11.1353857", "titel": "", "jobs": [184], "weight": 1 },
  {
    "IDs": "663290",
    "lat": "49.312263700000003",
    "lng": "12.169443299999999",
    "titel": "Abschlussarbeit Master / Bachelor Softwareentwicklung Python",
    "jobs": [185],
    "weight": 1
  },
  {
    "IDs": "663267",
    "lat": "48.0711753",
    "lng": "11.6502873",
    "titel": "Praktikant (m/w/d) Digital Factory",
    "jobs": [186],
    "weight": 1
  },
  {
    "IDs": "663261,663242",
    "lat": "49.453717599999997",
    "lng": "11.0874355",
    "titel": "Praktikant (m/w/d) im Bereich Datenanalyse\nTrainee (m/w/d) Gesamtbank",
    "jobs": [188, 189],
    "weight": 2
  },
  {
    "IDs": "663288,663287,663226,663011,662924,662766,659280,657365,656541,656542,656543",
    "lat": "49.452834299999999",
    "lng": "11.093236599999999",
    "titel": "\n\nzentralen Webkoordinator (w/m/d)\n\n\n\n\n\nEnergetischer Vergleich von Aktoren\nErweitertes Steuerungskonzept eines bionischen Gelenkroboters\nWeiterentwicklung von Aktorvarianten eines bionischen Gelenkroboters",
    "jobs": [190, 191, 197, 231, 235, 250, 473, 571, 626, 627, 628],
    "weight": 11
  },
  {
    "IDs": "663241,663240",
    "lat": "49.499683500000003",
    "lng": "10.966692999999999",
    "titel": "\n",
    "jobs": [192, 193],
    "weight": 2
  },
  {
    "IDs": "663220",
    "lat": "48.1806877",
    "lng": "11.5854824",
    "titel": "Support Engineer",
    "jobs": [195],
    "weight": 1
  },
  {
    "IDs": "663224,664011,663771,663782,663794,663795,662363,661768,661769",
    "lat": "49.5896744",
    "lng": "11.011961100000001",
    "titel": "\nIngenieur / Bachelor (m/w/d) als Betriebs- und Projektingenieur (m/w/d) - TGA\nVerwaltungsangestellter (m/w/d) - Campusmanagement\n\nSachbearbeiter (m/w/d) - Drittmittel und Rechtsangelegenheiten der Forschung mit dem Schwerpunkt Wirtschaftswissenschaften oder Verwaltung\nSachbearbeiter (m/w/d) - Drittmittel und Rechtsangelegenheiten der Forschung mit dem Schwerpunkt Wirtschaftswissenschaften oder Verwaltung\nWissenschaftsmanager*in Next Generation Computing\nSoftware-Entwickler mit Web- und App-Schwerpunkt (m/w/d)\nSoftware-Entwickler mit Web- und App-Schwerpunkt (m/w/d)",
    "jobs": [196, 1046, 1129, 1139, 1151, 1152, 1924, 2079, 2080],
    "weight": 9
  },
  {
    "IDs": "663221,662925",
    "lat": "49.429900000000004",
    "lng": "11.87425",
    "titel": "Bachelor-Arbeit\nSuchen Werkstudent-/in im Bauwesen",
    "jobs": [198, 210],
    "weight": 2
  },
  {
    "IDs": "663216,663109",
    "lat": "49.791878099999998",
    "lng": "9.9304900000000007",
    "titel": "IT-Systembetreuer Technische Assistenzsysteme (w/m/d)\nWerkstudent IT-Service (w/m/d)",
    "jobs": [200, 217],
    "weight": 2
  },
  {
    "IDs": "663198",
    "lat": "48.173303599999997",
    "lng": "11.532414599999999",
    "titel": "Werkstudent/-in (m/w/div) im Bereich Marketing",
    "jobs": [201],
    "weight": 1
  },
  {
    "IDs": "663225,663088",
    "lat": "48.18891",
    "lng": "11.6473",
    "titel": "\nWerkstudent Office Management (m/w/d)",
    "jobs": [203, 221],
    "weight": 2
  },
  {
    "IDs": "663187,661572,659108",
    "lat": "48.122742899999999",
    "lng": "11.4340549",
    "titel": "\n\nWerkstudent (w/m/d) im Eventmanagement",
    "jobs": [208, 372, 481],
    "weight": 3
  },
  {
    "IDs": "663186,662108",
    "lat": "48.208651600000003",
    "lng": "12.4016363",
    "titel": "Personalreferent mit dem Schwerpunkt Weiterbildung (m/w/d)\nController (m/w/d)",
    "jobs": [209, 2024],
    "weight": 2
  },
  {
    "IDs": "662754",
    "lat": "49.4539483",
    "lng": "11.0883755",
    "titel": "Werkstudent Customer Onboarding Consulting (m/w/d)",
    "jobs": [211],
    "weight": 1
  },
  {
    "IDs": "663171",
    "lat": "48.106373400000003",
    "lng": "10.3034465",
    "titel": "Praktikant im Bereich Forschung &amp; Entwicklung (m/w/d)",
    "jobs": [212],
    "weight": 1
  },
  {
    "IDs": "663189",
    "lat": "48.41563",
    "lng": "10.86768",
    "titel": "Junior Cloud Engineer (w/m/d)",
    "jobs": [213],
    "weight": 1
  },
  {
    "IDs": "663188",
    "lat": "49.429320699999998",
    "lng": "11.0193154",
    "titel": "Junior Datenbankadministrator (w/m/d) - Oracle",
    "jobs": [214],
    "weight": 1
  },
  {
    "IDs": "663135",
    "lat": "48.077348499999999",
    "lng": "11.5248127",
    "titel": "Werkstudent Kommunikations- oder Grafikdesign (w/m/d)",
    "jobs": [215],
    "weight": 1
  },
  {
    "IDs": "663132",
    "lat": "49.442169999999997",
    "lng": "11.004660599999999",
    "titel": "Praktikant Einkauf International (m/w/d)",
    "jobs": [216],
    "weight": 1
  },
  {
    "IDs": "663089",
    "lat": "48.384610899999998",
    "lng": "11.048474000000001",
    "titel": "Anwendungsentwickler (m/w/d) Vollzeit Sportbranche ",
    "jobs": [218],
    "weight": 1
  },
  {
    "IDs": "663093",
    "lat": "49.401961399999998",
    "lng": "11.1598282",
    "titel": "Bachelor- / Masterarbeit (m/w/d) - Entwicklung einer neuen Messfinger-Generation des FFM",
    "jobs": [219],
    "weight": 1
  },
  {
    "IDs": "663087,652590",
    "lat": "48.986868200000004",
    "lng": "12.2107043",
    "titel": "Praktikant (m/w/d)* Speditionslogistik\nSenior Embedded-Softwareentwickler Automotive (m/w/d)",
    "jobs": [222, 2550],
    "weight": 2
  },
  {
    "IDs": "663091,662707",
    "lat": "48.025303000000001",
    "lng": "10.8506608",
    "titel": "Abschlussarbeit Einkauf\nData Engineer (m/w/d)",
    "jobs": [223, 1839],
    "weight": 2
  },
  {
    "IDs": "663083",
    "lat": "48.4963768",
    "lng": "9.1909427000000008",
    "titel": "Abschlussarbeit in der MEMS-Entwicklung",
    "jobs": [224],
    "weight": 1
  },
  {
    "IDs": "663057,663056",
    "lat": "47.459271800000003",
    "lng": "9.6356383000000001",
    "titel": "\n",
    "jobs": [225, 226],
    "weight": 2
  },
  {
    "IDs": "663018",
    "lat": "47.645000000000003",
    "lng": "10.294420000000001",
    "titel": "",
    "jobs": [228],
    "weight": 1
  },
  {
    "IDs": "663016",
    "lat": "49.944390300000002",
    "lng": "11.569922200000001",
    "titel": "Ingenieur (m/w/d) der Fachrichtung Tiefbau",
    "jobs": [229],
    "weight": 1
  },
  {
    "IDs": "662929",
    "lat": "49.259729999999998",
    "lng": "10.62396",
    "titel": "Pflichtpraktikant Softwareimplementierung (m/w/d)",
    "jobs": [230],
    "weight": 1
  },
  { "IDs": "662948", "lat": "48.157625600000003", "lng": "11.5244321", "titel": "", "jobs": [232], "weight": 1 },
  {
    "IDs": "662947",
    "lat": "49.018060499999997",
    "lng": "12.056667600000001",
    "titel": "Traineeprogramm Spezialist (m/w/d) Marktfolge",
    "jobs": [233],
    "weight": 1
  },
  {
    "IDs": "662930",
    "lat": "50.223529900000003",
    "lng": "11.062410099999999",
    "titel": "SAP Prozessmanager (m/w/d)",
    "jobs": [234],
    "weight": 1
  },
  {
    "IDs": "662921",
    "lat": "48.1951818",
    "lng": "12.596229599999999",
    "titel": "Werkstudent Institution Fund Sales (m/w/d)",
    "jobs": [237],
    "weight": 1
  },
  {
    "IDs": "662893,662894",
    "lat": "49.500810000000001",
    "lng": "11.43041",
    "titel": "Praktikum im Bereich Webdesign\n",
    "jobs": [241, 242],
    "weight": 2
  },
  {
    "IDs": "662855",
    "lat": "49.6743636",
    "lng": "12.148933700000001",
    "titel": "Projektingenieur (m/w/d)",
    "jobs": [243],
    "weight": 1
  },
  {
    "IDs": "662880,659098",
    "lat": "59.913868800000003",
    "lng": "10.7522454",
    "titel": "Prakt \nPraktikant (m/w/d) im Bereich Infra-Construction Skandinavien am Standort Oslo oder Stockholm ",
    "jobs": [244, 488],
    "weight": 2
  },
  {
    "IDs": "662859,659623,659304,659305,659306,659276,659277,659278,657762,657764,655290,655288,654705,654706",
    "lat": "47.715960000000003",
    "lng": "10.313829999999999",
    "titel": "Abschlussarbeit (MA/BA) / Projektarbeit/Praktikum: Entwicklung einer Verkehrsszenarienextraktion auf\n\nEntwicklung eines Modules zur Banddickenmessung in Stanz-Biege-Anlagen\nSegmentierung von Stanzteilen mittels Deep Learning\nReal-Time-Optimierung eines Bildverarbeitungsalgorithmus zur Segmentierung von Stanzteilen\n\n\nEntwicklung eines datengetriebenen Fahrzeugmodells\n\nEvaluierung der fahrdynamisch hervorgerufenen Kopfbewegung im Fahrzeug Konzeption, Umsetzung und Ana\n\nPraktikant Adrive Living Lab - Vehicle Testing Team \n\n",
    "jobs": [245, 462, 470, 471, 472, 474, 475, 476, 479, 553, 647, 648, 660, 661],
    "weight": 14
  },
  {
    "IDs": "662854",
    "lat": "49.075807400000002",
    "lng": "12.1988658",
    "titel": "Bauingenieur (m/w/d) - Fachrichtung Tiefbau",
    "jobs": [246],
    "weight": 1
  },
  {
    "IDs": "662800,660221",
    "lat": "9.9981413000000003",
    "lng": "-84.1197643",
    "titel": "\n",
    "jobs": [247, 395],
    "weight": 2
  },
  {
    "IDs": "662752,661753",
    "lat": "49.121429999999997",
    "lng": "10.78008",
    "titel": "Praktikumsstelle im Bereich Planung (Supply Chain) (m/w/d)\nPraktikumsstelle im Bereich Business Process Improvement (m/w/d)",
    "jobs": [248, 348],
    "weight": 2
  },
  {
    "IDs": "662731,661999,654466,654467,662699,662703,662704,660498",
    "lat": "51.165691000000002",
    "lng": "10.451525999999999",
    "titel": "AWS Cloud-Talentprogramm (m/w/d)\nJunior Consulant (m/w/d)\n\n\n\n\nBusiness Development Manager (m/w/d)\nKey Account Manager B2B - myHomelift (Mensch*)",
    "jobs": [249, 313, 673, 674, 1833, 1837, 1838, 2149],
    "weight": 8
  },
  {
    "IDs": "662209",
    "lat": "48.110292000000001",
    "lng": "11.578946",
    "titel": "Projektingenieur Projektsteuerung/Projektmanagement (w/m/d)",
    "jobs": [251],
    "weight": 1
  },
  {
    "IDs": "662665,663815,663541,663526,663527,663343,663200,663201,663007,656957,656958,655331,655332",
    "lat": "49.945639900000003",
    "lng": "11.5713346",
    "titel": "Account Manager (m/w/d) Bereich EMS\n\n\n\n\n\n\n\nReferent Asset Management (m/w/d)\n\n\n\n",
    "jobs": [254, 1169, 1256, 1366, 1367, 1463, 1523, 1524, 1685, 2480, 2481, 2506, 2507],
    "weight": 13
  },
  {
    "IDs": "662664",
    "lat": "50.253390000000003",
    "lng": "10.96088",
    "titel": "Mitarbeit bei Entwicklung an LoRaWAN-Applikationen",
    "jobs": [255],
    "weight": 1
  },
  {
    "IDs": "657218",
    "lat": "49.718325200000002",
    "lng": "11.070511399999999",
    "titel": "Bauingenieur / Bauzeichner / Bautechniker (m/w/d)",
    "jobs": [256],
    "weight": 1
  },
  {
    "IDs": "657455,657454,657457,658939",
    "lat": "48.736759999999997",
    "lng": "11.175280000000001",
    "titel": "\n\n\n",
    "jobs": [257, 258, 265, 266],
    "weight": 4
  },
  {
    "IDs": "655750,655749,655748,653458",
    "lat": "48.767389899999998",
    "lng": "11.4317615",
    "titel": "\n\nHiL (Hardware-in-the-Loop) Modell eines Heizungssystems\n",
    "jobs": [259, 260, 261, 264],
    "weight": 4
  },
  {
    "IDs": "655747,653459",
    "lat": "48.758105899999997",
    "lng": "11.4332052",
    "titel": "\nAufbau einer Analyse der Trinkwasserentnahme mit LabVIEW / Development of an automated domestic hot ",
    "jobs": [262, 263],
    "weight": 2
  },
  { "IDs": "658940", "lat": "48.758273899999999", "lng": "11.4321632", "titel": "", "jobs": [267], "weight": 1 },
  {
    "IDs": "658941",
    "lat": "48.766861599999999",
    "lng": "11.432067999999999",
    "titel": "",
    "jobs": [268],
    "weight": 1
  },
  {
    "IDs": "658942,658943,658944,661990",
    "lat": "48.767329099999998",
    "lng": "11.4317613",
    "titel": "Prognose von Kennwerten zur flexiblen Steuerung von Kraftwerken mit selbstlernenden Algorithmen\n\n\n",
    "jobs": [269, 270, 271, 272],
    "weight": 4
  },
  {
    "IDs": "662640,662641,662642",
    "lat": "49.764601399999997",
    "lng": "9.9055338000000006",
    "titel": "STUDENT/-IN (m/w/d) TERMINPLANUNG\nSTUDENT/-IN (m/w/d) PROZESSMANAGEMENT UND GLOSSAR\nSTUDENT (m/w/d) PROJEKTMANAGEMENT",
    "jobs": [273, 274, 275],
    "weight": 3
  },
  {
    "IDs": "662631",
    "lat": "48.129870699999998",
    "lng": "11.5834522",
    "titel": "Abschlussarbeit &quot;Konstruktion einer Kugelbahn&quot;",
    "jobs": [276],
    "weight": 1
  },
  { "IDs": "662629", "lat": "48.175729500000003", "lng": "11.5182935", "titel": "", "jobs": [277], "weight": 1 },
  {
    "IDs": "662628,662702,661587,659861,659613,657812,657828,657775",
    "lat": "48.766535099999999",
    "lng": "11.425754100000001",
    "titel": "\nAutomatisierungstechniker* SPS-Programmierung\nAgile Coach (m/w/d)\nBautechniker / Bauingenieur Fachrichtung Tiefbau (m/w/d)\n\nSoftware Entwickler C++ / C# (m/w/d)\nSoftware Testingenieur (m/w/d)\nSoftwareingenieur (m/w/d)",
    "jobs": [278, 1836, 2123, 2292, 2355, 2430, 2433, 2445],
    "weight": 8
  },
  {
    "IDs": "662596",
    "lat": "49.198333900000002",
    "lng": "10.178027200000001",
    "titel": "Werkstudent - technichsche Projekte im Distributionszentrum (m/w/d)",
    "jobs": [280],
    "weight": 1
  },
  {
    "IDs": "660047",
    "lat": "49.299932300000002",
    "lng": "10.5595763",
    "titel": "Praktikum mit der Fachrichtung Architektur ",
    "jobs": [282],
    "weight": 1
  },
  { "IDs": "662509", "lat": "49.4721495", "lng": "11.063937599999999", "titel": "", "jobs": [283], "weight": 1 },
  {
    "IDs": "662510",
    "lat": "48.122905199999998",
    "lng": "11.453144699999999",
    "titel": " Praktikant (w/m/d) Grafikdesign Print &amp; Digital",
    "jobs": [285],
    "weight": 1
  },
  {
    "IDs": "662449,657223,657224,657225,657226,657229,657230,656669,656670,656672,656673,656674,656676,656677,655362,654515,654514,654509,653798,653797,653796,653795,653794,653793,653791,653790,653239,652913,652912,652904,652903,652902,652901,652900,652899,652898,652897,652045,652044,664243,664244,663822,663823,663202,663204,661869,661870,661824,660324,659969",
    "lat": "49.0068901",
    "lng": "8.4036527000000003",
    "titel": "Thesis/Praktikum: Vergleich von Integrationspattern\n\n\nThesis/Praktikum: Kundenanalyse mit NewSQL-Datenbanken\n\nThesis/Praktikum: Neue Produkte in der Telekommunikationsbranche durch 5G\n\nThesis/Praktikum: Einsatz von Salesforce Einstein zur Anwendung von Artificial Intelligence\nThesis/Praktikum: Einsatz von Moat und Artificial Intelligence im CRM-Umfeld\nThesis/Praktikum: Real-Time-Deployment und  Go-to-Market-Strategien\nThesis/Praktikum: Verwendung von Entwicklungspattern in der Cloud-Entwicklung\nThesis/Praktikum: Verbesserung der Customer Experience durch performante Angebotsprozesse\nThesis/Praktikum: Erweiterung eines Frameworks zur Visualisierung von Vertriebsgebieten\nThesis/Praktikum: Internet of Things (IoT) als Megatrend in der Telekommunikationsbranche\n\n\n\nThesis/Praktikum:  Augmented Reality (AR) &amp; Virtual Reality (VR) in Salesforce Commerce Cloud\nThesis/Praktikum: TensorFlow im CRM-Kontext\nThesis/Praktikum: Redis im Performancevergleich bei Integrationsszenarien\nThesis/Praktikum: Splunk im Einsatz mit Salesforce \nThesis/Praktikum: Microsoft Teams in der responsiven Organisation\nThesis/Praktikum: Veeva &amp; Salesforce Marketing Cloud\nThesis/Praktikum: Reactive Programming bei komplexen Integrationsszenarien\nThesis/Praktikum: Einbettung von Artificial Intelligence in CRM-Systeme\nThesis/Praktikum: Steigerung der Sales Performance durch Gamification\n\n\n\n\nThesis/Praktikum: Konzeption eines Desktop CRM-Client\n\n\nThesis/Praktikum: Cloudbasierte Integration von Social Media Monitoring mit CRM\n\nThesis/Praktikum: Development Best Practices als universelle Toolbox im digitalen Marketing\nThesis/Praktikum: Nahtlose Integration von Cloud-Services\n\nThesis/Praktikum: Worst-Case-Szenarien bei Cloud Integration \n(Junior) Trade Marketing Manager (m/w/d)\n(Junior) Trade Marketing Manager (m/w/d)\nTechnical Consultant - Digital Architect (m/w/d)\nTechnical Consultant - Digital Architect (m/w/d)\nLinux Systemadministrator (m/w/d)\nWindows Systemadministrator (m/w/d)\n\n\nIT-Servicemanager (w/m/d)\nWebentwickler (m/w)\nBusiness Analyst (w/m/d)",
    "jobs": [
      288,
      599,
      600,
      601,
      602,
      603,
      604,
      612,
      613,
      614,
      615,
      616,
      617,
      618,
      645,
      668,
      669,
      670,
      692,
      693,
      694,
      695,
      696,
      697,
      698,
      699,
      713,
      721,
      722,
      723,
      724,
      725,
      726,
      727,
      728,
      729,
      730,
      759,
      760,
      853,
      854,
      1173,
      1174,
      1525,
      1527,
      2057,
      2058,
      2098,
      2160,
      2262
    ],
    "weight": 50
  },
  {
    "IDs": "662348",
    "lat": "49.274204500000003",
    "lng": "11.466802400000001",
    "titel": "Werkstudent (m/w/d) im Bereich Tax",
    "jobs": [289],
    "weight": 1
  },
  {
    "IDs": "662446",
    "lat": "49.9777719",
    "lng": "9.2558383000000006",
    "titel": "Praxissemester Bereich Operations",
    "jobs": [290],
    "weight": 1
  },
  {
    "IDs": "662448",
    "lat": "47.858755000000002",
    "lng": "12.3545303",
    "titel": "Werksstudentenjob in Prien am Chiemsee",
    "jobs": [291],
    "weight": 1
  },
  {
    "IDs": "662421",
    "lat": "48.304907499999999",
    "lng": "11.205086400000001",
    "titel": "Funktechniker*in (m/w/d)",
    "jobs": [292],
    "weight": 1
  },
  { "IDs": "662399", "lat": "48.325682499999999", "lng": "10.8953443", "titel": "", "jobs": [293], "weight": 1 },
  {
    "IDs": "662358,660144,660145",
    "lat": "49.029789399999999",
    "lng": "12.131233699999999",
    "titel": "Masterand Innovation Bildverarbeitung\nWerkstudent (m/w/d) generische Hardware Architektur\n",
    "jobs": [294, 397, 398],
    "weight": 3
  },
  {
    "IDs": "662355",
    "lat": "48.1077212",
    "lng": "11.604099",
    "titel": "Webentwickler Werkstudent (M/W/D)",
    "jobs": [295],
    "weight": 1
  },
  { "IDs": "662349", "lat": "48.162795799999998", "lng": "11.5991082", "titel": "", "jobs": [296], "weight": 1 },
  {
    "IDs": "662344",
    "lat": "49.149623900000002",
    "lng": "10.072581599999999",
    "titel": "Abschlussarbeit: Entwicklung und Erprobung von Konzepten zur Nutzung neuartiger Transportsysteme",
    "jobs": [298],
    "weight": 1
  },
  {
    "IDs": "662301",
    "lat": "48.403295999999997",
    "lng": "12.746904499999999",
    "titel": "Trainee Grafikdesign / Kommunikationsdesign (w/m/d)",
    "jobs": [299],
    "weight": 1
  },
  {
    "IDs": "662281",
    "lat": "48.076948199999997",
    "lng": "10.12351",
    "titel": "Praktikant (m/w/d) Human Resources",
    "jobs": [300],
    "weight": 1
  },
  { "IDs": "662286", "lat": "49.285961100000002", "lng": "10.7872985", "titel": "", "jobs": [301], "weight": 1 },
  {
    "IDs": "662226",
    "lat": "48.130562699999999",
    "lng": "11.6115888",
    "titel": "Ingenieur*in (w/m/d) der Fachrichtung Bauingenieurwesen",
    "jobs": [304],
    "weight": 1
  },
  {
    "IDs": "662241",
    "lat": "49.462795700000001",
    "lng": "11.137946100000001",
    "titel": "Studentische Aushilfe (Semesterferien und gelegentlich Samstags)",
    "jobs": [306],
    "weight": 1
  },
  {
    "IDs": "662191",
    "lat": "48.230747000000001",
    "lng": "8.4208037999999998",
    "titel": "Abschlussarbeit im Bereich Strategische Ersatzteildisposition - Ersatzteile / Service",
    "jobs": [309],
    "weight": 1
  },
  {
    "IDs": "662129",
    "lat": "48.040830800000002",
    "lng": "11.508789999999999",
    "titel": "Working Student in Controlling (m/f/d)",
    "jobs": [310],
    "weight": 1
  },
  {
    "IDs": "662125",
    "lat": "49.517724999999999",
    "lng": "11.035684",
    "titel": "Werkstudent (m/w/d) Vertrieb International",
    "jobs": [312],
    "weight": 1
  },
  {
    "IDs": "662078,662079",
    "lat": "48.355519999999999",
    "lng": "9.9449699999999996",
    "titel": "Praktikant - Grafik / Design (m/w/d)\nPraktikant - Corporate Communications (m/w/d)",
    "jobs": [314, 315],
    "weight": 2
  },
  {
    "IDs": "661569",
    "lat": "48.291058399999997",
    "lng": "13.021190900000001",
    "titel": "",
    "jobs": [316],
    "weight": 1
  },
  {
    "IDs": "662069,661662,661679",
    "lat": "49.4865134",
    "lng": "11.1284142",
    "titel": "\nStudentische Hilfskraft / Praktikant (w/m/d) im Forschungsfeld Lokalisierung und Vernetzung\n",
    "jobs": [317, 356, 358],
    "weight": 3
  },
  {
    "IDs": "662061",
    "lat": "48.699421000000001",
    "lng": "12.6513806",
    "titel": "Full-Stack-Entwickler/Webentwickler/Frontendentwickler",
    "jobs": [318],
    "weight": 1
  },
  {
    "IDs": "659196,659197",
    "lat": "48.112627000000003",
    "lng": "11.5450777",
    "titel": "Duales Studium - Informatik\nDuales Studium - Wirtschaftsinformatik",
    "jobs": [320, 321],
    "weight": 2
  },
  {
    "IDs": "661995,661994,661993",
    "lat": "48.791383600000003",
    "lng": "11.4379428",
    "titel": "Masteranden (m/w) FEM Analysen Fahrzeugsicherheit\nMasterand (m/w/d) Data Mining\nMasteranden (m/w/d) Systems Engineering",
    "jobs": [322, 323, 324],
    "weight": 3
  },
  {
    "IDs": "661989,654335,654465",
    "lat": "49.183440500000003",
    "lng": "10.0723106",
    "titel": "Bauleiter Gleisinfrastruktur  (m/w/d)\n\n",
    "jobs": [325, 671, 672],
    "weight": 3
  },
  {
    "IDs": "661992,664311,664262,664123,664124,664055,664056,664057,663875,663876,663772,663741,663553,663554,663567,663495,663496,663387,663390,663391,663406,663419,663308,664178,663251,663252,663269,663194,663195,663211,663048,662916,662962,662963,662968,662723,662724,662324,662325,661977,660353,660294,660295,659778,659515,659516,659038,659039,656915,650020,649655",
    "lat": "48.7758459",
    "lng": "9.1829321000000004",
    "titel": "Planungskoordinator im Infrastrukturbau (m/w/d)\nGrafiker/-in / Designer/-in (m/w/d)\nBauingenieur / Architekt Akquisition / Kalkulation (w/m/d)\nGeoinformatiker/-innen (Diplom-Ingenieur/-in bzw. Bachelor of Engineering Vermessung/Geoinformation) (m/w/d)\nGeoinformatiker/-innen (Diplom-Ingenieur/-in bzw. Bachelor of Engineering Vermessung/Geoinformation) (m/w/d)\n\nIngenieure/Ingenieurinnen, Diplom/ Bachelor der Fachrichtungen Bauingenieurwesen, Maschinenbau, Chemieingenieurwesen, Elektrotechnik als Sachbearbeiter/-innen (m/w/d)\nIngenieure/Ingenieurinnen, Diplom/ Bachelor der Fachrichtungen Bauingenieurwesen, Maschinenbau, Chemieingenieurwesen, Elektrotechnik als Sachbearbeiter/-innen (m/w/d)\nWirtschaftsinformatiker als Business Analyst (m/w/d) im Bereich Business Process &amp; IT Transformation\nWirtschaftsinformatiker als Business Analyst (m/w/d) im Bereich Business Process &amp; IT Transformation\n\n\nDiplom-Ingenieur/-in (FH) oder Bachelor of Engineering/Science (m/w/d)\nDiplom-Ingenieur/-in (FH) oder Bachelor of Engineering/Science (m/w/d)\n\nMitarbeiter/Mitarbeiterin (m/w/d) Digitalisierung im Spezialtiefbau\nMitarbeiter/Mitarbeiterin (m/w/d) Digitalisierung im Spezialtiefbau\nBauleiter (w/m/d)\nIngenieurin / Ingenieur (w/m/d) (Bachelor/Dipl.-Ing.) der Fachrichtungen Bau- oder Verkehrsingenieurwesen\nIngenieurin / Ingenieur (w/m/d) (Bachelor/Dipl.-Ing.) der Fachrichtungen Bau- oder Verkehrsingenieurwesen\nMachine Learning Engineer / Data Engineer (m/w/d)\nSystemadministrator/in (m/w/d)\nInformatiker/-innen bzw. Mathematiker/-innen (w/m/d) Bereich Anwendungsentwicklung\n&quot;Digital Expert&quot; oder &quot;Systemadministrator&quot; (m/w/d)\n\n\n\n\n\nSAP Business One Berater JOB (m/w/x)\n\n\nMitarbeiterin / Mitarbeiter (w/m/d) Informationssicherheit\nMitarbeiterin / Mitarbeiter (w/m/d) Informationssicherheit\n\nJunior/Senior Digital Consultant (m/w/d)\nJunior/Senior Digital Consultant (m/w/d)\n\n\nConsultant (m/w/d) Prozessdigitalisierung und -automatisierung (RPA &amp; Low Code Development)\n\nIT-Berater / IT Consultants (m/w/d) im Patentwesen\nIT-Berater / IT Consultants (m/w/d) im Patentwesen\nIT Solution Architect Microsoft 365 (m/w/d)\n\n\nSoftwareentwickler (m/w/d) Embedded C++ / Linux\nSoftwareentwickler (m/w/d) Embedded C++ / Linux\nIngenieur (m/w/d) Produktkommunikation / Marketing B2B\nIngenieur Testautomatisierung Automotive (m/w/d)\nAnlagen- und Prozessplaner (m/w/d)",
    "jobs": [
      326,
      794,
      870,
      948,
      949,
      993,
      994,
      995,
      1068,
      1069,
      1130,
      1242,
      1264,
      1265,
      1269,
      1341,
      1342,
      1379,
      1380,
      1381,
      1392,
      1404,
      1434,
      1473,
      1485,
      1486,
      1498,
      1520,
      1521,
      1534,
      1605,
      1636,
      1647,
      1648,
      1651,
      1851,
      1852,
      1955,
      1956,
      2048,
      2166,
      2214,
      2215,
      2317,
      2359,
      2360,
      2389,
      2390,
      2486,
      2581,
      2595
    ],
    "weight": 51
  },
  {
    "IDs": "661979",
    "lat": "49.559220000000003",
    "lng": "10.69131",
    "titel": "Praktikant (m/w/d) Verpackungstechnologie",
    "jobs": [327],
    "weight": 1
  },
  {
    "IDs": "661960",
    "lat": "47.512783399999996",
    "lng": "10.291068299999999",
    "titel": "Studentische Hilfskraft (m/w/d) Bereich Marktanalyse &amp; Recherche",
    "jobs": [328],
    "weight": 1
  },
  {
    "IDs": "661942,661940,657136,653306,653307",
    "lat": "49.732129999999998",
    "lng": "12.07723",
    "titel": "Abschlussarbeit im Bereich Konstruktion\nAbschlussarbeit im Bereich Materialflusssteuerung\nAbschlussarbeit im Bereich Semiautomatische Maschinenvalidierung\nAbschlussarbeit im Bereich Semiautomatische Maschinenvalidierung\nPraktikum / Abschlussarbeit im Bereich Neukonzeptionierung Schaltschrankbau und Installation",
    "jobs": [329, 330, 606, 710, 711],
    "weight": 5
  },
  {
    "IDs": "661920",
    "lat": "48.102218800000003",
    "lng": "11.643977",
    "titel": "Hochschulpraktikantin*en",
    "jobs": [331],
    "weight": 1
  },
  {
    "IDs": "661918,660117,660122,660129,658392",
    "lat": "48.040501399999997",
    "lng": "11.6652003",
    "titel": "\nPraktikant (m/w/d) in der Entwicklung von Brennstoffzellen - Elektronik und Anwendungstechnik\nPraktikant (m/w/d) in der Entwicklung von Brennstoffzellen im Bereich Elektronik Hardware\nPraktikant oder Werkstudent Human Resources / Personalwesen (w/m/d)\nPraktikant/ Werkstudent (m/w/d) - Finance &amp; Controlling",
    "jobs": [332, 388, 405, 406, 524],
    "weight": 5
  },
  {
    "IDs": "661859",
    "lat": "48.148416300000001",
    "lng": "11.618059300000001",
    "titel": "Werkstudent (w/m/d) Abendsekretariat 2984",
    "jobs": [333],
    "weight": 1
  },
  {
    "IDs": "657521",
    "lat": "49.831270099999998",
    "lng": "9.8803666000000003",
    "titel": "",
    "jobs": [334],
    "weight": 1
  },
  {
    "IDs": "658286",
    "lat": "48.134898900000003",
    "lng": "11.5541971",
    "titel": "Werkstudent - CRM Online Integration m/w/d",
    "jobs": [335],
    "weight": 1
  },
  {
    "IDs": "661861,661860,661858,661857,661856,653626,653629,653784,653785,653786,654047,654404",
    "lat": "49.460395200000001",
    "lng": "11.0283467",
    "titel": "Betriebsdaten einer organischen Photovoltaik\n\nThermische Belastbarkeit eines Erdkabels durch Photovoltaik oder E-Autos\nRegelung einer Kleinwindanlage optimieren\n\nEinfluss von Wind und Temperatur auf den Ertrag einer Photovoltaik\nEffizienzsteigerung einer Batterie validieren\nPrognose des Ladestroms von Elektroautos in einer Wohnanlage\n\nInbetriebnahme einer Mikro-PV-Anlage\n\n",
    "jobs": [336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 675],
    "weight": 12
  },
  {
    "IDs": "661765",
    "lat": "49.298402299999999",
    "lng": "10.5861398",
    "titel": "Praktikant Business Development Robotics (m/w/d)",
    "jobs": [347],
    "weight": 1
  },
  {
    "IDs": "661697,662378",
    "lat": "48.2488721",
    "lng": "11.6532477",
    "titel": "Bachelorarbeit CAD-CAM Roboter-Bahnplanung &quot;Regulus&quot;\nFull Stack Developer (m/w/d) Cloud Services",
    "jobs": [349, 1930],
    "weight": 2
  },
  { "IDs": "661694", "lat": "48.050783000000003", "lng": "10.8703515", "titel": "", "jobs": [350], "weight": 1 },
  {
    "IDs": "661668",
    "lat": "49.891843199999997",
    "lng": "10.892610700000001",
    "titel": "",
    "jobs": [352],
    "weight": 1
  },
  {
    "IDs": "661680",
    "lat": "48.092990100000002",
    "lng": "11.3575438",
    "titel": "Werkstudent (m/w/d) im Bereich Global Compliance",
    "jobs": [353],
    "weight": 1
  },
  {
    "IDs": "661667",
    "lat": "48.790447200000003",
    "lng": "11.497889499999999",
    "titel": "Vertriebsmitarbeiter Elektrophysiologie",
    "jobs": [354],
    "weight": 1
  },
  {
    "IDs": "660337",
    "lat": "48.74709",
    "lng": "11.465199999999999",
    "titel": "Praktisches Studiensemester (Maschinenbau/Wirtschaftsingenieurwesen/Luftfahrttechnik)",
    "jobs": [355],
    "weight": 1
  },
  { "IDs": "661659", "lat": "48.233612700000002", "lng": "13.7746707", "titel": "", "jobs": [360], "weight": 1 },
  { "IDs": "661658", "lat": "45.501688899999998", "lng": "-73.567256", "titel": "", "jobs": [361], "weight": 1 },
  {
    "IDs": "653663,653662,653661,661629,661630,653693",
    "lat": "49.511048299999999",
    "lng": "11.278024500000001",
    "titel": "Praktikant (m/w/d) in der Entwicklung\nWerkstudent im Controlling\nPraktikant Controlling\nHR Praktikant (m/w/d)\nHR Werkstudent (m/w/d)\nWerkstudent (m/w/d) im Bereich Manufacturing Engineering",
    "jobs": [362, 363, 364, 365, 366, 632],
    "weight": 6
  },
  {
    "IDs": "661574",
    "lat": "49.799373199999998",
    "lng": "11.012121799999999",
    "titel": "Bachelorand/Masterand",
    "jobs": [367],
    "weight": 1
  },
  {
    "IDs": "661567",
    "lat": "48.418674600000003",
    "lng": "9.9079761000000008",
    "titel": "",
    "jobs": [368],
    "weight": 1
  },
  {
    "IDs": "661576,661578,661579,664324,664325,663646,663700,662742,662743,662744,662745",
    "lat": "48.284120000000001",
    "lng": "11.5672",
    "titel": "Werkstudent (w/m/d) im Produktmanagement Fokus Datamining  \nWerkstudent (w/m/d) im Produktmanagement Fokus: Competitive Intelligence\nWerkstudent (w/m/d) Business Intelligence / Power BI\n\n\n\nSenior Expert (m/w/d) Hochvolt-Batteriesysteme\n\n\n\n",
    "jobs": [369, 370, 371, 805, 806, 1191, 1208, 1740, 1741, 1742, 1743],
    "weight": 11
  },
  {
    "IDs": "660494",
    "lat": "48.367229999999999",
    "lng": "11.40282",
    "titel": "Ingenieur Forschung / Vorentwicklung Robotik (m/w/d)",
    "jobs": [374],
    "weight": 1
  },
  { "IDs": "660562", "lat": "48.133524000000001", "lng": "11.5593044", "titel": "", "jobs": [375], "weight": 1 },
  {
    "IDs": "660493",
    "lat": "49.425140800000001",
    "lng": "11.0558204",
    "titel": "Werkstudent PC-Support (m/w/d) 20 h/Woche",
    "jobs": [376],
    "weight": 1
  },
  {
    "IDs": "660473",
    "lat": "49.275262699999999",
    "lng": "11.9206089",
    "titel": "Praktikant (m/w/d) im Bereich Reporting und Controlling",
    "jobs": [377],
    "weight": 1
  },
  {
    "IDs": "658702",
    "lat": "50.1358739",
    "lng": "8.6762677000000004",
    "titel": "Volontariat als Aufnahmeleiter*in",
    "jobs": [378],
    "weight": 1
  },
  {
    "IDs": "660405",
    "lat": "47.796986199999999",
    "lng": "9.6215799999999998",
    "titel": "",
    "jobs": [379],
    "weight": 1
  },
  {
    "IDs": "660476",
    "lat": "48.058623699999998",
    "lng": "10.418757100000001",
    "titel": "Bachelor-/Masterarbeit",
    "jobs": [380],
    "weight": 1
  },
  {
    "IDs": "650423",
    "lat": "48.132699199999998",
    "lng": "11.6929569",
    "titel": "Praktikum im Marketing",
    "jobs": [381],
    "weight": 1
  },
  {
    "IDs": "660338",
    "lat": "48.142232399999997",
    "lng": "11.553494199999999",
    "titel": "",
    "jobs": [382],
    "weight": 1
  },
  {
    "IDs": "660226",
    "lat": "48.076650000000001",
    "lng": "11.72016",
    "titel": "Werkstudent (m/w/d) oder Praktikant (m/w/d) im Immobilienmanagement ",
    "jobs": [383],
    "weight": 1
  },
  {
    "IDs": "660323",
    "lat": "49.468750999999997",
    "lng": "11.0151693",
    "titel": "Elektronik Entwicklung in einem jungen Startup ",
    "jobs": [385],
    "weight": 1
  },
  {
    "IDs": "660224",
    "lat": "49.350777100000002",
    "lng": "11.157079899999999",
    "titel": "",
    "jobs": [390],
    "weight": 1
  },
  {
    "IDs": "660242,652326",
    "lat": "48.688598300000002",
    "lng": "9.1410265000000006",
    "titel": "Master-Thesis &quot;Acceptance Test Driven Development in Business Intelligence Applikationen&quot;\nBA-/MA-Thesis &quot;Die Business Intelligence Datenplattform mit der SAP Data Warehouse Cloud",
    "jobs": [391, 739],
    "weight": 2
  },
  {
    "IDs": "660228,660231,660232",
    "lat": "48.358397199999999",
    "lng": "11.441382300000001",
    "titel": "Abschlussarbeit Hardware- und Software-Entwicklung (m/w/d)\nAbschlussarbeit - Software-Entwicklung Testautomatisierung (m/w/d)\nAbschlussarbeit - Telekommunikation 5G (m/w/d)",
    "jobs": [392, 393, 394],
    "weight": 3
  },
  { "IDs": "660062", "lat": "48.1285703", "lng": "11.544692299999999", "titel": "", "jobs": [396], "weight": 1 },
  {
    "IDs": "660115",
    "lat": "48.411360000000002",
    "lng": "10.874739999999999",
    "titel": "Online Marketing",
    "jobs": [399],
    "weight": 1
  },
  {
    "IDs": "660121",
    "lat": "49.243169399999999",
    "lng": "10.225211099999999",
    "titel": "Aushilfe IT (m/w/d)",
    "jobs": [400],
    "weight": 1
  },
  {
    "IDs": "660131",
    "lat": "48.804779500000002",
    "lng": "11.459658299999999",
    "titel": "Bachelorand Fachrichtung Personalwesen (w/m/d)",
    "jobs": [401],
    "weight": 1
  },
  {
    "IDs": "660120",
    "lat": "49.926970400000002",
    "lng": "10.8810085",
    "titel": "Bachelor-oder Masterarbeit mit Praxisbezug",
    "jobs": [402],
    "weight": 1
  },
  {
    "IDs": "660136,660137",
    "lat": "50.311749599999999",
    "lng": "11.4516987",
    "titel": "Praktika, Bachelor- und Masterarbeiten\nPraktika, Bachelor- und Masterarbeiten",
    "jobs": [403, 404],
    "weight": 2
  },
  {
    "IDs": "659940",
    "lat": "48.650231499999997",
    "lng": "11.7751605",
    "titel": "Technischer Berater Kundenservice / Technische Dienstleistungen Klima (m/w/d)",
    "jobs": [407],
    "weight": 1
  },
  {
    "IDs": "660059",
    "lat": "48.437249999999999",
    "lng": "10.92665",
    "titel": "Software-Entwickler (w/m/d)",
    "jobs": [408],
    "weight": 1
  },
  {
    "IDs": "660050",
    "lat": "48.096798399999997",
    "lng": "11.523251200000001",
    "titel": "Entrepreneur in Residence (m/w/d)",
    "jobs": [410],
    "weight": 1
  },
  {
    "IDs": "659943,659945",
    "lat": "48.314343600000001",
    "lng": "11.9871237",
    "titel": "Dualer Student Shop Management/E-Commerce (m/w/d)\nWerkstudent Shop Management (m/w/d)",
    "jobs": [411, 420],
    "weight": 2
  },
  {
    "IDs": "660046",
    "lat": "48.391089999999998",
    "lng": "10.421849999999999",
    "titel": "",
    "jobs": [412],
    "weight": 1
  },
  {
    "IDs": "659465,657330,652917,652009,652011,652012,652013,664260,664261,664271,663344,662405,661907,661908,660461,652130,652131,652132",
    "lat": "48.370544899999999",
    "lng": "10.897790000000001",
    "titel": "Projektmanager (m/w/d) Auftragsabwicklung\nPraktikum im EUROPE DIRECT-Informationszentrum der Stadt Augsburg (Recherche- und Projektarbeit) \n\nAbschlussarbeit Modellierung einer Energieflexiblen Fabrik\nABSCHLUSSARBEIT Industrie 4.0: Einsatz von Digitalen Zwillingen in der Energieflexiblen Fabrik\n\nABSCHLUSSARBEIT Industrie 4.0: Entwicklung eines Modells einer Energieflexiblen Fabrik\n\n\n\nIT-Administrator (m/w/d/) - Abteilung Applikationen\nProjektmanager / Projektsteuerer (m/w/d)\nSozialarbeiter*in\nSozialarbeiter*in\nSAP FI / CO Berater (m/w/x)\nScrum Master (m/w/d)\nScrum Master (m/w/d)\nJava Softwareentwickler (m/w/d)",
    "jobs": [416, 578, 719, 761, 762, 763, 764, 868, 869, 879, 1464, 1939, 2073, 2074, 2196, 2561, 2562, 2563],
    "weight": 18
  },
  {
    "IDs": "659941,659942",
    "lat": "47.963009999999997",
    "lng": "11.305110000000001",
    "titel": "Praktikum Bauphysik\n",
    "jobs": [417, 418],
    "weight": 2
  },
  {
    "IDs": "660042",
    "lat": "50.034050999999998",
    "lng": "10.2068808",
    "titel": "Bachelorarbeit / Masterarbeit - Bestimmung einer Zeitfestigkeitslinie",
    "jobs": [419],
    "weight": 1
  },
  {
    "IDs": "658819",
    "lat": "48.145099999999999",
    "lng": "11.599478100000001",
    "titel": "Mitarbeiter IT (m/w/d) in Teilzeit (20-30h/Woche)",
    "jobs": [422],
    "weight": 1
  },
  {
    "IDs": "659846",
    "lat": "49.951396000000003",
    "lng": "11.573923499999999",
    "titel": "",
    "jobs": [423],
    "weight": 1
  },
  { "IDs": "659898", "lat": "49.186964000000003", "lng": "12.1129601", "titel": "", "jobs": [426], "weight": 1 },
  {
    "IDs": "659841",
    "lat": "48.178026299999999",
    "lng": "11.632174900000001",
    "titel": "Werkstudent Mechanik (m/w/d)",
    "jobs": [428],
    "weight": 1
  },
  { "IDs": "659820", "lat": "49.386013800000001", "lng": "11.376417", "titel": "", "jobs": [432], "weight": 1 },
  {
    "IDs": "659819,659818",
    "lat": "48.6187173",
    "lng": "10.181004700000001",
    "titel": "Abschlussarbeit im Wirtschaftsingenieurwesen (m/w/d) im Bereich der Produkt- und Prozessentwicklung\nPraxissemester im Wirtschaftsingenieurwesen (m/w/d) im Bereich Produkt- und Prozessentwicklung",
    "jobs": [433, 434],
    "weight": 2
  },
  {
    "IDs": "659816",
    "lat": "28.100883700000001",
    "lng": "-15.465389699999999",
    "titel": "Praktikum bei Surfcamp-online.com in Spanien auf Gran Canaria (Tourismus)",
    "jobs": [435],
    "weight": 1
  },
  {
    "IDs": "659815,659814",
    "lat": "48.139715799999998",
    "lng": "11.428615499999999",
    "titel": "\n",
    "jobs": [436, 437],
    "weight": 2
  },
  {
    "IDs": "658073",
    "lat": "48.7291338",
    "lng": "13.600911699999999",
    "titel": "Energieberater/in ",
    "jobs": [438],
    "weight": 1
  },
  {
    "IDs": "656013,656648,652047",
    "lat": "40.463667000000001",
    "lng": "-3.7492200000000002",
    "titel": "Spanien: Bezahltes Hotelpraktikum auf den Kanarischen Inseln\nBezahltes Hotelpraktikum in Spanien auf Gran Canaria\nReception internship in L'Escala, Girona",
    "jobs": [439, 442, 758],
    "weight": 3
  },
  {
    "IDs": "656014,656649,657120",
    "lat": "28.291563700000001",
    "lng": "-16.629130400000001",
    "titel": "Bezahltes Hotelpraktikum auf Teneriffa\nBezahltes Hotelpraktikum auf Teneriffa\nBezahltes Hotelpraktikum auf Teneriffa",
    "jobs": [440, 443, 444],
    "weight": 3
  },
  { "IDs": "656647", "lat": "35.937496000000003", "lng": "14.375416", "titel": "", "jobs": [441], "weight": 1 },
  {
    "IDs": "657121,655039",
    "lat": "51.507350899999999",
    "lng": "-0.12775829999999999",
    "titel": "Bezahltes Hotelpraktikum in London\n",
    "jobs": [445, 654],
    "weight": 2
  },
  {
    "IDs": "657122,657614",
    "lat": "27.760561899999999",
    "lng": "-15.586017200000001",
    "titel": "Spanien: Bezahltes Hotelpraktikum auf den Kanarischen Inseln\nSpanien: Bezahltes Hotelpraktikum auf den Kanarischen Inseln",
    "jobs": [446, 447],
    "weight": 2
  },
  {
    "IDs": "657615",
    "lat": "25.204849299999999",
    "lng": "55.270782799999999",
    "titel": "Bezahltes Praktikum in Luxushotel in Dubai (5 Sterne)",
    "jobs": [448],
    "weight": 1
  },
  {
    "IDs": "657618",
    "lat": "-25.274398000000001",
    "lng": "133.775136",
    "titel": "Bezahltes Hotelpraktikum in Australien",
    "jobs": [449],
    "weight": 1
  },
  {
    "IDs": "659761",
    "lat": "50.3135391",
    "lng": "11.9127814",
    "titel": "Architekt/in oder Bauingenieur/in (m/w/d)",
    "jobs": [450],
    "weight": 1
  },
  {
    "IDs": "659747",
    "lat": "48.434330000000003",
    "lng": "10.86679",
    "titel": "HR Specialist Systems (m/w/d)",
    "jobs": [451],
    "weight": 1
  },
  {
    "IDs": "659449,659450,659451",
    "lat": "8.0414920999999993",
    "lng": "98.836616199999995",
    "titel": "Marine Life Conservation Project\nMarine Life Conservation Project\nMarine Life Conservation Project",
    "jobs": [452, 453, 454],
    "weight": 3
  },
  {
    "IDs": "659748",
    "lat": "49.416091700000003",
    "lng": "11.0196431",
    "titel": "Praktikant (m/w/d) Online Marketing / eCommerce",
    "jobs": [455],
    "weight": 1
  },
  {
    "IDs": "659727",
    "lat": "19.432607699999998",
    "lng": "-99.133207999999996",
    "titel": "Praktikum in der Abteilung Trade&amp;Investment",
    "jobs": [456],
    "weight": 1
  },
  { "IDs": "659668", "lat": "50.423315799999997", "lng": "10.907593", "titel": "", "jobs": [457], "weight": 1 },
  {
    "IDs": "659670,659671",
    "lat": "50.422750000000001",
    "lng": "10.90451",
    "titel": "\n",
    "jobs": [458, 459],
    "weight": 2
  },
  {
    "IDs": "659624",
    "lat": "28.3587436",
    "lng": "-14.053675999999999",
    "titel": "Bar and Restaurant Internship in a 3* Hotel in the beautiful island of Fuerteventura, Canary Island",
    "jobs": [461],
    "weight": 1
  },
  {
    "IDs": "659559",
    "lat": "48.782594199999998",
    "lng": "9.0199200000000008",
    "titel": "Praktikant im Bereich Bauleitung (m/w/d)",
    "jobs": [464],
    "weight": 1
  },
  {
    "IDs": "659555",
    "lat": "48.643480799999999",
    "lng": "12.4851983",
    "titel": "Bachelor-/Masterarbeit: Social-Media-Marketing im B2B-Bereich",
    "jobs": [465],
    "weight": 1
  },
  {
    "IDs": "659395,659194",
    "lat": "29.046853500000001",
    "lng": "-13.5899733",
    "titel": "Bar Assistant (Food and Beverage) Internship in a 4* Hotel in the beautiful island of Lanzarote, Can\nBar Assistant (Food and Beverage) Internship in a 4* Hotel in the beautiful island of Lanzarote, Can",
    "jobs": [466, 482],
    "weight": 2
  },
  {
    "IDs": "659372",
    "lat": "49.947077100000001",
    "lng": "12.2398618",
    "titel": "Praktikum/Abschlussarbeit im Facility Management*",
    "jobs": [467],
    "weight": 1
  },
  {
    "IDs": "659307,662032",
    "lat": "48.835561800000001",
    "lng": "8.9130929000000005",
    "titel": "Abschlussarbeit - Thermischer Maschinenbau / Verbrennungskraftmaschinen\n",
    "jobs": [469, 2037],
    "weight": 2
  },
  {
    "IDs": "659289",
    "lat": "52.2296756",
    "lng": "21.012228700000001",
    "titel": "Praktikum am Goethe-Institut in Warschau",
    "jobs": [477],
    "weight": 1
  },
  { "IDs": "659229", "lat": "46.707130200000002", "lng": "11.6633757", "titel": "", "jobs": [478], "weight": 1 },
  {
    "IDs": "659105",
    "lat": "48.124109900000001",
    "lng": "11.4314056",
    "titel": "Werkstudent (w/m/d) klinische Studien",
    "jobs": [480],
    "weight": 1
  },
  {
    "IDs": "659144",
    "lat": "49.501124599999997",
    "lng": "11.041756599999999",
    "titel": "",
    "jobs": [484],
    "weight": 1
  },
  {
    "IDs": "659190",
    "lat": "48.263255000000001",
    "lng": "11.6716447",
    "titel": "Werkstudent im Bereich Test &amp; Entwicklung",
    "jobs": [485],
    "weight": 1
  },
  {
    "IDs": "659106",
    "lat": "48.130099999999999",
    "lng": "11.570489999999999",
    "titel": "Praktikanten (m/w) im Bereich Mobile-Development(Android/iOS)",
    "jobs": [487],
    "weight": 1
  },
  { "IDs": "658999", "lat": "48.201196000000003", "lng": "11.6145677", "titel": "", "jobs": [489], "weight": 1 },
  {
    "IDs": "659047",
    "lat": "49.24785",
    "lng": "11.1173",
    "titel": "Abschlussarbeit - Digitalisierung der Vertriebsprozesse",
    "jobs": [490],
    "weight": 1
  },
  {
    "IDs": "658946",
    "lat": "49.433351999999999",
    "lng": "11.097232099999999",
    "titel": "Praktikum im Bereich elektrische Energietechnik",
    "jobs": [491],
    "weight": 1
  },
  { "IDs": "658920", "lat": "49.4306324", "lng": "11.070732", "titel": "", "jobs": [492], "weight": 1 },
  {
    "IDs": "658707",
    "lat": "49.8090616",
    "lng": "9.9884950000000003",
    "titel": "Photo-Bonding von Kunststoffen mittels VUV-Eximerstrahlung",
    "jobs": [496],
    "weight": 1
  },
  {
    "IDs": "658525,658528,658523,658526",
    "lat": "50.450099999999999",
    "lng": "30.523399999999999",
    "titel": "Internship with the International Centre for Policy Studies in Kiev\n\nRoland Berger Consulting Internship in Kiev\n",
    "jobs": [498, 511, 513, 514],
    "weight": 4
  },
  {
    "IDs": "658698,658231,664291,664338,664339,664267,664103,664104,664132,663971,663915,663916,663725,663737,663499,663432,663321,663255,663256,663257,663258,663203,663156,663081,662979,662985,662891,662901,662819,662687,662715,662716,662068,662093,661802,661808,661737,661625,660278,660097,659927,659928,659787,659164,658638,658257,657855,649474,649502",
    "lat": "52.520006600000002",
    "lng": "13.404954",
    "titel": "Praktika im Bereich Projekt- und Wissenschaftsmanagement an der Polnischen Akademie der Wissenschaft\nPraktikum E-Commerce und Online-Marketing\n\n\n\n\nBauleiter / Bauleiterin (m/w/d)\nBauleiter / Bauleiterin (m/w/d)\nSoftware Developer, Digital Operation Specialist und Productmanager/Product Owner (m/w/d)\n\n\n\n\n\nIT Security Spezialist (m/w/d)\nBig Data Engineer (m/w/d)\n\nJava Developer (m/w/d)\nProduktspecialist Lohnsoftware (m/w/d)\nSAP Berater Job (m/w/x)\nSAP Berater Job (m/w/x)\nIT-Planerin/IT-Planer (w/m/d) Cloud Architektur\nBauleiter (m/w/d) im Bereich Innenausbau\n\nSystem Administrator (m/w/d)\n\nDevOps Engineer (m/w/d)\nSachbearbeitung Personalbetreuung operative Tochtergesellschaften\n\nIT - Leiter (m/w/d)\n\n\nIT-Systemadministrator (m/w/x)\nIT Projektmanager (m/w/d)\nSAP ABAP Entwickler (m/w/x) mit Know-how in Web Dynpro, SAP UI5 oder SAP Fiori\nSAP Retail Berater (m/w/x)\n(Junior) Projektingenieur (m/w/d) Prozess-, Verpackung- und Verfahrenstechnik\nTeamleitung Kalkulation (m/w/d)\nSoftware Engineer (Quality Assurance) (m/w/d)\nIngenieur / Architekt / Projektsteuerer (m/w/d) als Baumanager\nVAT Accountant (m/w/d)\nVAT Accountant (m/w/d)\nIT-Systemadministrator (w/m/d)\nSAP FI / CO Berater (m/w/x)\nSAP RE-FX Berater (m/w/x)\nSAP Basis Berater (m/w/x) - SAP Basis Consultant - SAP Basis Inhouse Position\nSAP PM / PS Berater (m/w/x)\nEmbedded-Softwareentwickler Automotive (m/w/d)\nIngenieur Autonomes Fahren (m/w/d)",
    "jobs": [
      499,
      532,
      775,
      818,
      819,
      875,
      931,
      932,
      952,
      1009,
      1100,
      1101,
      1228,
      1239,
      1345,
      1415,
      1446,
      1487,
      1488,
      1489,
      1490,
      1526,
      1556,
      1635,
      1661,
      1667,
      1721,
      1726,
      1773,
      1827,
      1846,
      1847,
      2015,
      2023,
      2088,
      2091,
      2114,
      2137,
      2207,
      2250,
      2308,
      2309,
      2320,
      2383,
      2407,
      2422,
      2434,
      2602,
      2603
    ],
    "weight": 49
  },
  {
    "IDs": "658655",
    "lat": "41.153331999999999",
    "lng": "20.168330999999998",
    "titel": "",
    "jobs": [501],
    "weight": 1
  },
  {
    "IDs": "658654",
    "lat": "48.019573000000001",
    "lng": "66.923683999999994",
    "titel": "Praktika in der Redaktion der DAZ - Deutsche Allgemeine Zeitung (Kasachstan)",
    "jobs": [502],
    "weight": 1
  },
  {
    "IDs": "658653",
    "lat": "50.850339599999998",
    "lng": "4.3517102999999997",
    "titel": "",
    "jobs": [503],
    "weight": 1
  },
  {
    "IDs": "658651",
    "lat": "47.497911999999999",
    "lng": "19.040234999999999",
    "titel": "Praktikum bei der Deutsch-Ungarischen Industrie- und Handelskammer: Beratung/Kommunikation // Recht",
    "jobs": [504],
    "weight": 1
  },
  {
    "IDs": "658621,658620",
    "lat": "48.038780099999997",
    "lng": "10.501225",
    "titel": "Elektroinbetriebnehmer/SPS-Programmierer (m/w/d) Neue Technologien/Montagetechnik\nQualifizierungsprogramm Softwarekonstruktion Neue Technologien/Montagetechnik",
    "jobs": [505, 506],
    "weight": 2
  },
  { "IDs": "624551", "lat": "49.691841099999998", "lng": "11.6287208", "titel": "", "jobs": [507], "weight": 1 },
  {
    "IDs": "658602,658601",
    "lat": "48.049515200000002",
    "lng": "10.485094999999999",
    "titel": "Applikationstechniker Bildverarbeitungssysteme (m/w/d)\nAntriebsinbetriebnehmer (m/w/d)",
    "jobs": [508, 509],
    "weight": 2
  },
  {
    "IDs": "658524",
    "lat": "48.379432999999999",
    "lng": "31.165579900000001",
    "titel": "GoCamp is looking for English/German/French-speaking volunteers for summer programmes in Ukraine",
    "jobs": [510],
    "weight": 1
  },
  {
    "IDs": "658527",
    "lat": "48.291682999999999",
    "lng": "25.935217000000002",
    "titel": "Praktikum ukrainisch-deutsche Kulturpojekte am Zentrum Gedankendach in Tscherniwzi (Czernowitz)",
    "jobs": [512],
    "weight": 1
  },
  {
    "IDs": "658521",
    "lat": "48.9756578",
    "lng": "14.480255",
    "titel": "Internships at Fiedler AMS: Web und SW Developer / Project Manager &amp; Business Developer",
    "jobs": [515],
    "weight": 1
  },
  {
    "IDs": "658519",
    "lat": "49.817492000000001",
    "lng": "15.472962000000001",
    "titel": "",
    "jobs": [516],
    "weight": 1
  },
  { "IDs": "658522", "lat": "49.634571200000003", "lng": "10.7120666", "titel": "", "jobs": [517], "weight": 1 },
  {
    "IDs": "658520,658518,655732",
    "lat": "41.385063899999999",
    "lng": "2.1734035",
    "titel": "German - Administration Internship in an E-commerce company in Barcelona\nGerman - Customer service internship in Barcelona\nGerman - Marketing &amp; Sourcing in an international recruitment agency in Barcelona",
    "jobs": [518, 519, 637],
    "weight": 3
  },
  {
    "IDs": "658418,658417",
    "lat": "48.036108900000002",
    "lng": "10.7211327",
    "titel": "Bachelorarbeit / Tragwerksplanung, Brandschutz, Entwurfs- und Genehmigungsplanung, Konstruktion\nPraktikum im Bereich Tragwerksplanung, Brandschutz, Entwurfs- und Genehmigungsplanung, Konstruktion",
    "jobs": [522, 523],
    "weight": 2
  },
  {
    "IDs": "658391",
    "lat": "48.095147300000001",
    "lng": "9.7901524999999996",
    "titel": "Bachelorand (m/w/d) im Personalmanagement",
    "jobs": [525],
    "weight": 1
  },
  {
    "IDs": "658379",
    "lat": "49.300109999999997",
    "lng": "10.5712501",
    "titel": "(Pflicht-)Praktikant/-in mit Fokus Marketing, Grafik &amp; Webdesign (m/w/d) ",
    "jobs": [527],
    "weight": 1
  },
  {
    "IDs": "656125",
    "lat": "49.3288905",
    "lng": "11.0244827",
    "titel": " Ingenieur oder Techniker im Bereich Maschinenbau oder Verfahrenstechnik (m/w/d/x)",
    "jobs": [531],
    "weight": 1
  },
  {
    "IDs": "658148,658157",
    "lat": "55.755825999999999",
    "lng": "37.617299899999999",
    "titel": "\nPraktikum Projektmanagement bei swilar in Moskau",
    "jobs": [533, 542],
    "weight": 2
  },
  {
    "IDs": "658149",
    "lat": "59.931058399999998",
    "lng": "30.360909599999999",
    "titel": "",
    "jobs": [534],
    "weight": 1
  },
  {
    "IDs": "658150,658146",
    "lat": "61.524009999999997",
    "lng": "105.31875599999999",
    "titel": "Alfa Fellowship Program\nPraktikantenprogramm &quot;Russland in der Praxis&quot;",
    "jobs": [535, 537],
    "weight": 2
  },
  {
    "IDs": "658151",
    "lat": "55.761218",
    "lng": "52.011184200000002",
    "titel": "Alabuga International School (AIS) Volunteer Programs",
    "jobs": [536],
    "weight": 1
  },
  {
    "IDs": "658163",
    "lat": "48.148596499999996",
    "lng": "17.107747799999999",
    "titel": "Praktikum bei der Deutsch-Slowakischen Industrie- und Handelskammer",
    "jobs": [538],
    "weight": 1
  },
  {
    "IDs": "658164",
    "lat": "46.056946500000002",
    "lng": "14.505751500000001",
    "titel": "Praktikum bei der Deutsch-Slowenischen Industrie- und Handelskammer in Ljubljana",
    "jobs": [539],
    "weight": 1
  },
  {
    "IDs": "658172,658170",
    "lat": "50.075538100000003",
    "lng": "14.4378005",
    "titel": "Praktikum bei der Deutsch-Tschechischen Industrie- und handelskammer in Prag\nRedaktionelles Praktikum bei der Zeitschrift LandesEcho in Prag",
    "jobs": [540, 543],
    "weight": 2
  },
  {
    "IDs": "658144",
    "lat": "45.657975499999999",
    "lng": "25.6011977",
    "titel": "Praktikum im Deutschen Kulturzentrum Kronstadt",
    "jobs": [541],
    "weight": 1
  },
  {
    "IDs": "658154",
    "lat": "55.731057900000003",
    "lng": "37.573804099999997",
    "titel": "Redaktionspraktikum bei der Moskauer Deutschen Zeitung in Moskau",
    "jobs": [544],
    "weight": 1
  },
  {
    "IDs": "658160",
    "lat": "44.786568000000003",
    "lng": "20.448921599999998",
    "titel": "Traineeships with the EU Delegation to the Republic of Serbia in Belgrade ",
    "jobs": [545],
    "weight": 1
  },
  {
    "IDs": "658034,657363,655365",
    "lat": "48.140921900000002",
    "lng": "11.574885800000001",
    "titel": "Praktikant (w/m/d) im Innovation Consulting\n\n",
    "jobs": [546, 575, 644],
    "weight": 3
  },
  {
    "IDs": "658020,658018",
    "lat": "48.123804300000003",
    "lng": "11.6082749",
    "titel": "\n",
    "jobs": [547, 548],
    "weight": 2
  },
  {
    "IDs": "657991",
    "lat": "49.590620999999999",
    "lng": "12.045415999999999",
    "titel": "Praktikumsstelle Praxissemester Bauingenieurwesen",
    "jobs": [549],
    "weight": 1
  },
  {
    "IDs": "658027",
    "lat": "48.149093700000002",
    "lng": "11.7313522",
    "titel": "Abschlussarbeit im Bereich Recruiting",
    "jobs": [550],
    "weight": 1
  },
  {
    "IDs": "658015,658014",
    "lat": "48.131693900000002",
    "lng": "11.3556855",
    "titel": "Absolventin / Absolvent Elektrotechnik\nWerkstudentin / Werkstudent  Elektrotechnik",
    "jobs": [551, 552],
    "weight": 2
  },
  {
    "IDs": "657635",
    "lat": "48.096387499999999",
    "lng": "11.7270436",
    "titel": "Junior Creative 3D",
    "jobs": [554],
    "weight": 1
  },
  {
    "IDs": "657712",
    "lat": "48.593868700000002",
    "lng": "16.818458",
    "titel": "Praktisches Studiensemester Informatik App-Entwicklung",
    "jobs": [555],
    "weight": 1
  },
  {
    "IDs": "657672,657670",
    "lat": "49.540860000000002",
    "lng": "12.128869999999999",
    "titel": "\n",
    "jobs": [556, 557],
    "weight": 2
  },
  {
    "IDs": "657673",
    "lat": "49.231158800000003",
    "lng": "11.670258199999999",
    "titel": "Studentische Aushilfe (w/m/d) am Standort Velburg",
    "jobs": [558],
    "weight": 1
  },
  {
    "IDs": "657642",
    "lat": "47.899159900000001",
    "lng": "11.832139400000001",
    "titel": "Praxissemester im Bereich Bauphysik",
    "jobs": [559],
    "weight": 1
  },
  {
    "IDs": "657643",
    "lat": "-33.930079900000003",
    "lng": "18.422260000000001",
    "titel": "Non-profit internship program in Africa (remote and on-site)",
    "jobs": [560],
    "weight": 1
  },
  {
    "IDs": "657611,657612,657619",
    "lat": "49.451178599999999",
    "lng": "11.052556299999999",
    "titel": "Praktikum (m/w/d) Digital Services\nPraktikum (m/w/d) Fahrgastinformation\nBachelorand/Masterand (m/w/d) als Projektentwickler Immobilien",
    "jobs": [561, 562, 566],
    "weight": 3
  },
  {
    "IDs": "657675,657674",
    "lat": "48.438880300000001",
    "lng": "13.333152200000001",
    "titel": "\n",
    "jobs": [563, 567],
    "weight": 2
  },
  {
    "IDs": "657607",
    "lat": "45.807423399999998",
    "lng": "15.9690029",
    "titel": "Internships at the Institute for Development and International Relations in Zagreb ",
    "jobs": [564],
    "weight": 1
  },
  {
    "IDs": "657608",
    "lat": "45.815010800000003",
    "lng": "15.9819189",
    "titel": "Praktikum bei der AHK Kroatien",
    "jobs": [565],
    "weight": 1
  },
  { "IDs": "657720", "lat": "49.498383400000002", "lng": "11.389453", "titel": "", "jobs": [568], "weight": 1 },
  {
    "IDs": "657613",
    "lat": "47.5053907",
    "lng": "9.7480478999999995",
    "titel": "Vorarlberger Architektur :::::  Pflichtpraktikum",
    "jobs": [570],
    "weight": 1
  },
  {
    "IDs": "657338",
    "lat": "47.977358099999996",
    "lng": "10.176349500000001",
    "titel": "Praktikanten m/w/d in verschiedenen Bereichen",
    "jobs": [573],
    "weight": 1
  },
  {
    "IDs": "657340",
    "lat": "45.796738400000002",
    "lng": "15.776286199999999",
    "titel": "Internship with Rimac Automobili in Sveta Nedelja - Engineering, Development, Research",
    "jobs": [576],
    "weight": 1
  },
  {
    "IDs": "657329",
    "lat": "49.512475500000001",
    "lng": "12.533620900000001",
    "titel": "Praktikum im Kulturbereich im Centrum Bavaria Bohemia (CeBB) ",
    "jobs": [579],
    "weight": 1
  },
  {
    "IDs": "657318",
    "lat": "47.912511700000003",
    "lng": "11.277266600000001",
    "titel": "",
    "jobs": [580],
    "weight": 1
  },
  {
    "IDs": "657315,657317,657325,657324,657322,657320,657326,657323,657319,657321",
    "lat": "48.121074700000001",
    "lng": "11.451423",
    "titel": "\nAufbau eines Predictive Maintenance Demonstrators mit Machine Learning\nDezentraler IoT-basierter Fahrgastinformationsanzeiger mit Mesh-Networking\nDocker Security\nEmbedded Linux &amp; Kernel Live Patching &amp; Update Cloud\nFortsetzung der Tischkicker Analyse mit Deep Learning\nPositionsbestimmung mit Bluetooth Low Energy unter Verwendung von IoT Devices\nRobocode mit echter Hardware\nVergleich von Hardware-Infernecing-Systemen\n",
    "jobs": [581, 582, 583, 584, 585, 586, 587, 588, 589, 590],
    "weight": 10
  },
  {
    "IDs": "657246,660486,660487",
    "lat": "49.751551999999997",
    "lng": "11.5432054",
    "titel": "\n\n",
    "jobs": [591, 2145, 2146],
    "weight": 3
  },
  {
    "IDs": "657279",
    "lat": "48.142400000000002",
    "lng": "11.592969999999999",
    "titel": "",
    "jobs": [594],
    "weight": 1
  },
  {
    "IDs": "657231",
    "lat": "56.949648699999997",
    "lng": "24.105186499999999",
    "titel": "Praktikum bei der Deutsch-Baltischen Handelskammer in Riga / Tallinn / Vilnius ",
    "jobs": [595],
    "weight": 1
  },
  {
    "IDs": "657239",
    "lat": "59.433081100000003",
    "lng": "24.749311899999999",
    "titel": "Internship at Eesti Pank",
    "jobs": [596],
    "weight": 1
  },
  {
    "IDs": "657241",
    "lat": "53.900601100000003",
    "lng": "27.558972000000001",
    "titel": "Praktikum beim Goethe-Institut in Minsk",
    "jobs": [597],
    "weight": 1
  },
  {
    "IDs": "657244",
    "lat": "42.697708200000001",
    "lng": "23.3218675",
    "titel": "Praktikum bei der Deutsch-Bulgarischen Industrie- und Handelskammer (DEinternational und Messebereic",
    "jobs": [598],
    "weight": 1
  },
  { "IDs": "657066", "lat": "49.432520599999997", "lng": "10.9711906", "titel": "", "jobs": [607], "weight": 1 },
  { "IDs": "657054", "lat": "49.303449999999998", "lng": "10.56392", "titel": "", "jobs": [608], "weight": 1 },
  {
    "IDs": "657034",
    "lat": "49.198440699999999",
    "lng": "10.1780522",
    "titel": "Abschlussarbeiten",
    "jobs": [609],
    "weight": 1
  },
  {
    "IDs": "653460",
    "lat": "49.455875599999999",
    "lng": "11.074652199999999",
    "titel": "eCommerce / Online Marketing Werkstudent - Kosmetik",
    "jobs": [620],
    "weight": 1
  },
  {
    "IDs": "656472",
    "lat": "48.9517515",
    "lng": "10.6021053",
    "titel": "Werkstudent (m/w/d) Logistik/Supply Chain Management",
    "jobs": [621],
    "weight": 1
  },
  {
    "IDs": "656591",
    "lat": "48.1535613",
    "lng": "11.5053483",
    "titel": "Praktikum Idee CO2",
    "jobs": [622],
    "weight": 1
  },
  {
    "IDs": "656564,656590",
    "lat": "50.102412700000002",
    "lng": "11.0330064",
    "titel": "\nPraktikum Projektrealisierung von PV-Kraftwerken",
    "jobs": [623, 624],
    "weight": 2
  },
  {
    "IDs": "656554",
    "lat": "48.001790700000001",
    "lng": "9.8248183000000004",
    "titel": "Abschlussarbeit im Bereich Holzbau/Ausbau",
    "jobs": [625],
    "weight": 1
  },
  {
    "IDs": "655950,663983,663000",
    "lat": "49.477116899999999",
    "lng": "10.988667",
    "titel": "Werksstudent im Bereich Java-Entwicklung (m/w/d)\nSoftware-Entwickler und Tester (w/m/d)\n",
    "jobs": [630, 1020, 1680],
    "weight": 3
  },
  {
    "IDs": "656129",
    "lat": "52.349556999999997",
    "lng": "-1.58073",
    "titel": "Marketing, Sales &amp; Recruitment Admin Manager",
    "jobs": [631],
    "weight": 1
  },
  {
    "IDs": "656100",
    "lat": "49.039729999999999",
    "lng": "10.605223199999999",
    "titel": "Steuerassistent/in",
    "jobs": [633],
    "weight": 1
  },
  { "IDs": "653730", "lat": "48.242838599999999", "lng": "12.5056618", "titel": "", "jobs": [635], "weight": 1 },
  { "IDs": "655802", "lat": "49.027208899999998", "lng": "10.9710237", "titel": "", "jobs": [636], "weight": 1 },
  {
    "IDs": "655733",
    "lat": "37.389092400000003",
    "lng": "-5.9844588999999999",
    "titel": "German - Paid International Customer Service in Seville, Spain",
    "jobs": [638],
    "weight": 1
  },
  {
    "IDs": "655800",
    "lat": "48.132770200000003",
    "lng": "11.625500300000001",
    "titel": "Praktikum",
    "jobs": [639],
    "weight": 1
  },
  {
    "IDs": "655666,655665,655654",
    "lat": "48.913248799999998",
    "lng": "11.8704699",
    "titel": "Entwicklung von Softwaretools zur Analyse von wissenschaftlichen Kamerasystemen \nAbschlussarbeit: Entwicklung eines Gigabit Ethernet Schnittstellentreibers mit Linux\n",
    "jobs": [641, 642, 643],
    "weight": 3
  },
  {
    "IDs": "655356,654016",
    "lat": "-31.420083300000002",
    "lng": "-64.188776099999998",
    "titel": "\nAuslandspraktikum: Psychologie/Soziale Arbeit in Argentinien 20/21",
    "jobs": [646, 685],
    "weight": 2
  },
  {
    "IDs": "655063,655064,655065",
    "lat": "49.734080499999997",
    "lng": "10.1473777",
    "titel": "Planungsingenieur Mittel- und Hochspannung\nProjektingenieur Mittel- und Hochspannung\n",
    "jobs": [649, 650, 651],
    "weight": 3
  },
  {
    "IDs": "655062",
    "lat": "50.09892",
    "lng": "11.422929999999999",
    "titel": "Vertriebsingenieur Theromotechnik (m/w/d)",
    "jobs": [652],
    "weight": 1
  },
  {
    "IDs": "655040",
    "lat": "48.558040900000002",
    "lng": "12.817826800000001",
    "titel": "Praktikant (m/w/d) als Assistenz der Projektleitung",
    "jobs": [653],
    "weight": 1
  },
  {
    "IDs": "655031",
    "lat": "49.002214500000001",
    "lng": "12.100555099999999",
    "titel": "",
    "jobs": [655],
    "weight": 1
  },
  {
    "IDs": "654937",
    "lat": "50.222052099999999",
    "lng": "11.132915300000001",
    "titel": "Bachelor of Engineering / Statiker / Tragwerksplaner (w/m/d)",
    "jobs": [656],
    "weight": 1
  },
  {
    "IDs": "654776,654775",
    "lat": "49.264099999999999",
    "lng": "10.59592",
    "titel": "\n",
    "jobs": [657, 658],
    "weight": 2
  },
  {
    "IDs": "653406,653408,653407,653404,653401",
    "lat": "48.387376199999999",
    "lng": "10.8473419",
    "titel": "Semester-Praktikum Social-Media\n\nSemester-Praktikum Planung / Architektur\n\nSemester-Praktikum Bau-/Projektmanagement",
    "jobs": [659, 704, 705, 708, 709],
    "weight": 5
  },
  {
    "IDs": "654580",
    "lat": "43.134222399999999",
    "lng": "5.8037437000000001",
    "titel": "",
    "jobs": [662],
    "weight": 1
  },
  {
    "IDs": "654618,654617,654616,654615,654614",
    "lat": "49.485181799999999",
    "lng": "11.096422199999999",
    "titel": "Untersuchung zur Portierbarkeit eines Simulink-Blockset zwischen verschiedenen Simulink-Versionen\n\nKonzeptionierung und Realisierung eines Radar-Chips an GNU Radio\n\n",
    "jobs": [663, 664, 665, 666, 667],
    "weight": 5
  },
  {
    "IDs": "654342",
    "lat": "48.188657800000001",
    "lng": "11.5877517",
    "titel": "Praktikum im Bereich Fahrzeugtechnik",
    "jobs": [676],
    "weight": 1
  },
  {
    "IDs": "654216,654223,654225,654226",
    "lat": "48.399679300000003",
    "lng": "9.9566792",
    "titel": "Bachelor- oder Masterarbeit (m/w/d/x) im Bereich Supply Chain Management - ERP System\nBachelor- oder Masterarbeit (m/w/d/x) im Bereich Supply Chain Management- Supplier Feedback\nBachelor- oder Masterarbeit (m/w/d/x) im Bereich der Bahntechnologie - ETCS\nBachelor- oder Masterarbeit (m/w/d/x) im Bereich Forschung &amp; Entwicklung - User Interface",
    "jobs": [678, 679, 680, 681],
    "weight": 4
  },
  {
    "IDs": "654038,654036,654037,653659",
    "lat": "48.428280000000001",
    "lng": "10.8660107",
    "titel": "\nDoktor Medizintechnik in der Implantologie\n\n",
    "jobs": [682, 683, 684, 700],
    "weight": 4
  },
  {
    "IDs": "653915,653914,653913,653912,653911,653804,664224,664263,663776,663812,663702,663703,663333,662769,662609,662610,661902",
    "lat": "50.078218399999997",
    "lng": "8.2397608000000009",
    "titel": "Abschlussarbeit: Regelungsalgorhythmus vs. Machine Learning\nAbschlussarbeit: Transfer agiler Methoden auf den Entwicklungsprozess\n\n\n\nAbschlussarbeit: Prototyp eines technischen Datenmanagementsystems\n\nProjektmanager/in - Scrum Master (w/m/d)\nIT-Sicherheitsexperte/-in\n\n\n\n\nBusiness Partner Commercial Controlling (m/w/d)\nIntegrationsmanager/in (w/m/d)\nIncident-Manager/in und Leiter/in des Supports (w/m/d)\nProjektmanager (m/w/d) Datenmanagement B2B",
    "jobs": [686, 687, 688, 689, 690, 691, 834, 871, 1134, 1168, 1210, 1211, 1455, 1748, 1862, 1863, 2071],
    "weight": 17
  },
  { "IDs": "653608", "lat": "48.1903547", "lng": "11.6039444", "titel": "", "jobs": [701], "weight": 1 },
  { "IDs": "653584", "lat": "48.119301800000002", "lng": "11.5777891", "titel": "", "jobs": [703], "weight": 1 },
  {
    "IDs": "653523",
    "lat": "48.150842500000003",
    "lng": "11.539944800000001",
    "titel": "",
    "jobs": [706],
    "weight": 1
  },
  {
    "IDs": "653472",
    "lat": "49.485529999999997",
    "lng": "11.878590000000001",
    "titel": "Bachelorarbeit / Patent-Recherche zur Verwendung von CNT Materialien in der Filtertechnik (ab 10/20)",
    "jobs": [707],
    "weight": 1
  },
  {
    "IDs": "653235",
    "lat": "47.500749999999996",
    "lng": "9.7423099999999998",
    "titel": "",
    "jobs": [712],
    "weight": 1
  },
  {
    "IDs": "653077",
    "lat": "49.543905700000003",
    "lng": "11.0296681",
    "titel": "Ingenieur / Informatiker (m/w/d)",
    "jobs": [714],
    "weight": 1
  },
  {
    "IDs": "653015",
    "lat": "48.232064600000001",
    "lng": "11.706778699999999",
    "titel": "Softwareentwickler IT-Security (m/w)",
    "jobs": [715],
    "weight": 1
  },
  {
    "IDs": "652930",
    "lat": "47.646050000000002",
    "lng": "11.36375",
    "titel": "Duales Bachelorstudium - Fachrichtung Elektrotechnik",
    "jobs": [716],
    "weight": 1
  },
  {
    "IDs": "652933,652932",
    "lat": "47.816123099999999",
    "lng": "10.892701499999999",
    "titel": "Pratktikum im Bereich Inhouse Consulting\nAbschlussarbeit im Bereich Inhouse Consulting",
    "jobs": [717, 718],
    "weight": 2
  },
  {
    "IDs": "652084",
    "lat": "48.029345300000003",
    "lng": "10.710512400000001",
    "titel": "Praktikant (m/w/d) im Bauingenieurwesen",
    "jobs": [720],
    "weight": 1
  },
  {
    "IDs": "652529",
    "lat": "47.377286900000001",
    "lng": "8.5327611000000001",
    "titel": "",
    "jobs": [731],
    "weight": 1
  },
  { "IDs": "652462", "lat": "49.411087100000003", "lng": "11.055107", "titel": "", "jobs": [732], "weight": 1 },
  { "IDs": "652399", "lat": "48.180034300000003", "lng": "10.7557069", "titel": "", "jobs": [733], "weight": 1 },
  {
    "IDs": "652330,652329,652334",
    "lat": "51.256859400000003",
    "lng": "6.8077056999999996",
    "titel": "\n\nMasterarbeit &quot;Sprachsteuerung mit Amazon Alexa im SAP HANA basierten Unternehmensreporting&quot;",
    "jobs": [734, 738, 744],
    "weight": 3
  },
  {
    "IDs": "652327,652332,652331,652328,652335,652333,652336,664116,663716",
    "lat": "48.698007199999999",
    "lng": "9.1407427000000006",
    "titel": "Abschlussarbeit &quot;Aufbau von Methodiken zur Prozessreifegradbestimmung in Bezug auf RPA-Tools&quot;\nAbschlussarbeit &quot;Big Data unter Kontrolle mit dem SAP Data Hub&quot;\nAbschlussarbeit &quot;Business Intelligence in Echtzeit mit SAP BW4/HANA&quot;\nBachelor-/Master-Thesis &quot;Treiberbasierte Planung&quot;\nMasterarbeit &quot;Analyse zur Prozessautomatisierungs- / Prozessoptimierungspotenzialen mit SAP&quot;\nMasterarbeit &quot;Machine Learning mit Microsoft Azure&quot;\nMasterarbeit &quot;Predictive Maintenance mit Microsoft Azure&quot;\nReferent (m/w/d) im Bereich Digitalisierung\nMitarbeiter (m/w/d) im Stadtmarketing",
    "jobs": [735, 736, 737, 740, 741, 742, 743, 942, 1220],
    "weight": 9
  },
  {
    "IDs": "652316,652317",
    "lat": "48.880389999999998",
    "lng": "12.604980100000001",
    "titel": "Praktikanten (m/w/d) aus dem Bereich Elektrotechnik\n",
    "jobs": [745, 746],
    "weight": 2
  },
  {
    "IDs": "652168",
    "lat": "54.768565799999998",
    "lng": "9.3201754999999995",
    "titel": "Studienarbeit im Bereich der erneuerbaren Energien mit Schwerpunkt Marketing",
    "jobs": [747],
    "weight": 1
  },
  {
    "IDs": "652158",
    "lat": "54.7703366",
    "lng": "9.3245079999999998",
    "titel": "Studienarbeit in der Branche der erneuerbaren Energien mit technischem Schwerpunkt",
    "jobs": [748],
    "weight": 1
  },
  {
    "IDs": "652155",
    "lat": "54.772816400000004",
    "lng": "9.3293207999999996",
    "titel": "Studienarbeit im Bereich der erneuerbaren Energien mit betriebswirtschaftlichem Schwerpunkt ",
    "jobs": [749],
    "weight": 1
  },
  {
    "IDs": "652128",
    "lat": "50.049204699999997",
    "lng": "10.219422700000001",
    "titel": "ABSCHLUSSARBEIT Implementierung einer Materialflusssimulation einer energieflexiblen Fabrik",
    "jobs": [751],
    "weight": 1
  },
  {
    "IDs": "652112",
    "lat": "48.096510000000002",
    "lng": "11.532629999999999",
    "titel": "",
    "jobs": [752],
    "weight": 1
  },
  {
    "IDs": "652107",
    "lat": "49.069265199999997",
    "lng": "12.062021100000001",
    "titel": "",
    "jobs": [753],
    "weight": 1
  },
  {
    "IDs": "651899",
    "lat": "50.248216200000002",
    "lng": "12.072457999999999",
    "titel": "Abschlussarbeit - PR-Interne Kommunikation",
    "jobs": [754],
    "weight": 1
  },
  {
    "IDs": "651906,651894",
    "lat": "50.248393200000002",
    "lng": "12.035160400000001",
    "titel": "Abschlussarbeit - IT\n",
    "jobs": [755, 756],
    "weight": 2
  },
  {
    "IDs": "652085",
    "lat": "47.840685899999997",
    "lng": "11.1421379",
    "titel": "Bachelor- oder Masterarbeit zu &quot;Green Marketing &amp; Design eines Umweltprojektes&quot; in Unternehmen",
    "jobs": [757],
    "weight": 1
  },
  {
    "IDs": "664340",
    "lat": "48.943207999999998",
    "lng": "8.3980172",
    "titel": "SPS-Programmierer (m/w/d)",
    "jobs": [765],
    "weight": 1
  },
  {
    "IDs": "664279",
    "lat": "49.899161100000001",
    "lng": "8.5991073",
    "titel": "Technischer/Technische Trainee (m/w/d)",
    "jobs": [766],
    "weight": 1
  },
  {
    "IDs": "664280",
    "lat": "50.880040700000002",
    "lng": "7.0149268999999999",
    "titel": "ERP Key-User Kaufm. Sachbearbeitung (m/w/d)",
    "jobs": [767],
    "weight": 1
  },
  {
    "IDs": "664284,664070,659875,659876",
    "lat": "51.338760899999997",
    "lng": "6.5853416999999999",
    "titel": "Packaging Engineer (m/w/d)\n\nIT-Systemadministrator (m/w/d)\nIT-Systemadministrator (m/w/d)",
    "jobs": [768, 904, 2295, 2296],
    "weight": 4
  },
  {
    "IDs": "664285,664232,664111,662740,662741,662700,662701,655311",
    "lat": "48.162686800000003",
    "lng": "11.6217484",
    "titel": "Mitarbeiter/-in im Veranstaltungsmanagement (m/w/d)\nController (m/w/d) im Berichtswesen\n\n\n\nMathematiker (m/w/d)\nMathematiker (m/w/d)\n",
    "jobs": [769, 842, 937, 1738, 1739, 1834, 1835, 2505],
    "weight": 8
  },
  {
    "IDs": "664286",
    "lat": "49.1544764",
    "lng": "9.2220957000000006",
    "titel": "Kreditanalyst (m/w/d)",
    "jobs": [770],
    "weight": 1
  },
  {
    "IDs": "664287,664288",
    "lat": "48.729814300000001",
    "lng": "9.0999522000000006",
    "titel": "Sales-Trainee Personalberatung (m/w/x)\nJunior Sales Consultant Personalberatung (m/w/x)",
    "jobs": [771, 772],
    "weight": 2
  },
  {
    "IDs": "664289,664236,663877,663878,663576,663577,663578,663412,663208,663209,662538,662296,660432,660433,659692",
    "lat": "50.759585999999999",
    "lng": "6.9821412",
    "titel": "SAP Basis Administrator (gn)\nAssistent der Konzerneinkaufsleitung (gn)\nProjektleiter Facility Management - Versorgungstechnik (gn)\nProjektleiter Facility Management - Versorgungstechnik (gn)\nFullstack Entwickler (gn)\nFullstack Entwickler (gn)\nFullstack Entwickler Produktkonfiguratoren (gn)\n\nController (gn)\nSAP Entwickler (gn)\nProjektassistent Smart Home (gn)\nSoftwareentwickler Spryker / PHP (gn)\nJava Entwickler (gn)\nJava Entwickler (gn)\nJava Entwickler (gn)",
    "jobs": [773, 846, 1070, 1071, 1278, 1279, 1280, 1398, 1531, 1532, 1889, 1944, 2188, 2189, 2342],
    "weight": 15
  },
  {
    "IDs": "664292,663247,662542,658633",
    "lat": "51.045924800000002",
    "lng": "7.0192195999999996",
    "titel": "\n\nSenior Vertriebsmanager / Betriebswirt / Witschaftsingenieur / Wirtschaftsinformatiker (m/w/d)\nSAP FI / CO Berater (m/w/x)",
    "jobs": [776, 1482, 1890, 2405],
    "weight": 4
  },
  {
    "IDs": "664293,664294",
    "lat": "48.0753743",
    "lng": "11.7158225",
    "titel": "\n",
    "jobs": [777, 778],
    "weight": 2
  },
  {
    "IDs": "664295",
    "lat": "48.0054911",
    "lng": "7.7857931000000002",
    "titel": "IT-Systemadministrator (m/w/d)",
    "jobs": [779],
    "weight": 1
  },
  {
    "IDs": "664296,661965,661741,661742",
    "lat": "51.951655100000004",
    "lng": "8.5991675999999995",
    "titel": "Assistent (m/w/d) des CFO Sales &amp; Service\nAssistent (m/w/div.) des Vorstandsvorsitzenden\nAssistent (m/w/d) des COO EMEA South/East\nAssistent (m/w/d) des COO EMEA South/East",
    "jobs": [780, 2046, 2118, 2119],
    "weight": 4
  },
  {
    "IDs": "664297,664298,664313,664204,664133,663917,663796,662831,662832,659165",
    "lat": "49.992861699999999",
    "lng": "8.2472525999999995",
    "titel": "Informatiker*in (m/w/d)\nInformatiker*in (m/w/d)\nProjektmanager*in (m/w/d)\nAnwendungsentwickler*in (m/w/d)\n\nWissenschaftliche*r Mitarbeiter*in (m/w)\nInformatiker*in (m/w/d)\nGraduate Global Operations / International Graduate Program (m/f/d)\nGraduate Global Operations / International Graduate Program (m/f/d)\nSAP Basis Administrator (m/w/x)",
    "jobs": [781, 782, 796, 826, 953, 1102, 1153, 1780, 1781, 2384],
    "weight": 10
  },
  {
    "IDs": "664301,664302",
    "lat": "53.548037999999998",
    "lng": "10.017698599999999",
    "titel": "Sales Consultant (m/w/d) im Bereich Industrie\nSales Consultant (m/w/d) im Bereich Industrie",
    "jobs": [784, 785],
    "weight": 2
  },
  {
    "IDs": "664303,664304",
    "lat": "47.629415199999997",
    "lng": "9.9035823000000001",
    "titel": "IT-Service Manager Collaboration (m/w/d)\nIT-Service Manager Collaboration (m/w/d)",
    "jobs": [786, 787],
    "weight": 2
  },
  { "IDs": "664305", "lat": "52.453252300000003", "lng": "13.2885484", "titel": "", "jobs": [788], "weight": 1 },
  {
    "IDs": "664306",
    "lat": "48.044487400000001",
    "lng": "8.2265841999999996",
    "titel": "",
    "jobs": [789],
    "weight": 1
  },
  {
    "IDs": "664307,664308,664113,663274,663077",
    "lat": "48.770144899999998",
    "lng": "9.1693201000000002",
    "titel": "Business Analyst (w/m/d) im Referat Zahlungen und Fonds\nBusiness Analyst (w/m/d) im Referat Zahlungen und Fonds\nMathematiker / Physiker im Bereich Aktuariat (m/w/d)\nSocial Media Manager (m/w/d)\nBusiness Analyst (m/w/d) Vertriebssteuerung",
    "jobs": [790, 791, 939, 1501, 1631],
    "weight": 5
  },
  {
    "IDs": "664309,664310",
    "lat": "48.516697600000001",
    "lng": "9.2064400000000006",
    "titel": "\n",
    "jobs": [792, 793],
    "weight": 2
  },
  {
    "IDs": "664312,664058,663799,663456,663457,663396,663428,663429,663024,663076,663078,662907,662644,662645,662603,662604,662468,662476,662229,662230,662231,662155,662157,662158,662161,662162,661580,660325,660326,660064,660065,659976",
    "lat": "47.993854399999996",
    "lng": "7.8467583000000003",
    "titel": "IT-System Engineer (m/w/d)\nWissenschaftlicher Referent (m/w/d) in der Abteilung &quot;Radiologischer Notfallschutz&quot;\nProjektcontroller*in  in Forschung und Entwicklung\nProduct Owner Lernumgebung (m/w/d)\nProduct Owner Lernumgebung (m/w/d)\nDevelopment Engineer (m/w/d)\nResearch Scientist - Software Developer for Materials Informatics (m/f/d)\nResearch Scientist - Software Developer for Materials Informatics (m/f/d)\nAccounting Specialist (m/w/d)\nIT Service Manager (m/w/d)\nTeamleiter (m/w/d) IT Infrastructure\nBusiness Analyst Warenwirtschaftssysteme (m/w/d)\nPersonalsachbearbeiter (w/m/d)\nPersonalsachbearbeiter (w/m/d)\n(Junior) Web Developer / Frontend Entwickler (m/w/d)\n(Junior) Web Developer / Frontend Entwickler (m/w/d)\nMarketing Manger (m/w/d) Digitales Lernen\nMitarbeiter Controlling mit Schwerpunkt Kostenrechnung (m/w/d)\nProduct Owner (m/w/d)\nEditorial Manager (m/w/d) Rechnungswesen\nAccounting Specialist (m/w/d)\nFull Stack Entwickler (Java/JavaScript) - smartes Kundenmanagement (m/w/d)\nFull Stack Entwickler (Java/JavaScript) - innovative Rechnungsstellung (m/w/d)\nFull Stack Entwickler (Java/JavaScript) - innovative Rechnungsstellung (m/w/d)\nDevOps Engineer (m/w/d)\n\nResearch Scientist* Numerische Simulation und Modellierung\n\n\n\n\n",
    "jobs": [
      795,
      970,
      1156,
      1311,
      1312,
      1386,
      1411,
      1412,
      1592,
      1630,
      1632,
      1731,
      1800,
      1801,
      1858,
      1859,
      1915,
      1916,
      1970,
      1971,
      1972,
      1999,
      2001,
      2002,
      2005,
      2006,
      2122,
      2161,
      2162,
      2224,
      2225,
      2264
    ],
    "weight": 32
  },
  {
    "IDs": "664314,663653,663654,663323,662939,662823,662362",
    "lat": "51.0504088",
    "lng": "13.737262100000001",
    "titel": "Softwareentwickler C# (w/m/d) Asset Management Systeme\nBerater/ Projektmitarbeiter Fahrgasterhebungen (m/w/d)\nBerater/ Projektmitarbeiter Fahrgasterhebungen (m/w/d)\nMicrosoft-Dynamics-Anwendungsadministrator (m/w/d)\nBid Management Support (m/w/d)\nElektrokonstrukteur (m/w/d)\nSAP Entwickler (m/w/d)",
    "jobs": [797, 1198, 1199, 1447, 1696, 1774, 1923],
    "weight": 7
  },
  {
    "IDs": "664317,664327,663550,663302,663049,662957,662934,662935,662772,662180,662181,661614,660518,659888,659895,659908,659617,654358,654200,654201",
    "lat": "52.375891600000003",
    "lng": "9.7320104000000001",
    "titel": "Windows-Administrator*in (m/w/d)\nCloud Administrator AWS (m/w/d)\n\nData Scientist/Ontology Engineer (m/w/d)\nDevOps Engineer (m/w/d)\nWeb Developer (m/w/d)\n\n\nSenior NPI Manager (m/f/d)\nBauleiter (m/w/d)\nBauleiter (m/w/d)\nProjektingenieur Betriebliches Regelwerk (m/w/d)\nMathematiker / Volkswirtschaftler (m/w/d) Risikoberichterstattung\nReferent Technisches Assetmanagement (m/w/d)\nSystemadministrator*\nRegulatory Affairs Manager (m/w/d) mit Schwerpunkt Entwicklungspartnerschaften\nLeiter Digital Subscription (m/w/d)\nConsultant / Manager (m/w/d) HR-Payroll\nHochschulabsolvent (m/w/d) - Business Process Solutions | HR-Payroll\nHochschulabsolvent (m/w/d) - Business Process Solutions | HR-Payroll",
    "jobs": [
      798,
      808,
      1261,
      1428,
      1606,
      1643,
      1691,
      1692,
      1751,
      2012,
      2013,
      2134,
      2155,
      2302,
      2303,
      2307,
      2322,
      2517,
      2521,
      2522
    ],
    "weight": 20
  },
  {
    "IDs": "664318,664319,664239,664106,663570,663514,663313,663259,663205,662770,662771,661893,661732,659681,643089,622072",
    "lat": "48.136210499999997",
    "lng": "11.572893000000001",
    "titel": "Softwareingenieur (w/m/div)\n\nSoftware Support Specialist (m/w/d)\nIT Consultant Workflow (m/w/d)\nTeamleiter (m/w/d)\nAgiler Java-Entwickler (m/w/d) IOT-Anwendungen - Industrie 4.0\n\nProjektmanager (m/w/d) Verkehrsanlagen Tram\nSoftware Development Engineer (m/w/d)\nRisikomanager (m/w/d)\nRisikomanager (m/w/d)\n\n\nIT Support Specialist (m/w/d)\nVersicherungssachbearbeiter (m/w/d) Innendienst / Account Manager Industrieversicherung\nErzieher (m/w/d) als Gruppenleitung",
    "jobs": [799, 800, 849, 934, 1272, 1358, 1438, 1491, 1528, 1749, 1750, 2067, 2113, 2338, 2633, 2666],
    "weight": 16
  },
  {
    "IDs": "664320,664321,664141,664151,663874,663883,663887,663779,663616,663617,663500,663424,663433,663196,662411,662412,662429,661973,661887,661767,660300,660301,659975,660029,660030,654249,636405,636406,636407",
    "lat": "50.1153944",
    "lng": "8.6805821000000005",
    "titel": "Consultant (m/w/d) Controlling &amp; Finance - Schwerpunkt Tax Reporting\nConsultant (m/w/d) Controlling &amp; Finance - Schwerpunkt Tax Reporting\nTrainee (w/m/d) - IT Projektmanagement\nIT Business Analyst (m/w/d) Kundenstatus (CRS &amp; FATCA, Legitimation)\nManaging Consultant Cisco Solution Architecture (m/w/d)\nSenior Solution Architect (m/w/d)\n\nIT Operations Engineer (m/w/d) Blockchain &amp; DLT\nJunior Expert (m/w/d) Governance &amp; Information Security\nJunior Expert (m/w/d) Governance &amp; Information Security\nAnwendungsbetreuer (m/w/d) Schwerpunkt: Governance\n\nBetriebsmanager (m/w/d)\nIT-Sicherheitsmanager (m/w/d)\n\n\nFeature Engineer (m/w/d) Baufinanzierung\nJava-Entwickler (m/w/d) mit Schwerpunkt Microservices\nDevOps / Cloud Platform Engineer (m/w/d) CI/CD\nInterner SAP RE-FX Berater / Interne SAP RE-FX Beraterin (m/w/d)\nConsultant (w/m/d) Controlling &amp; Finance\nConsultant (w/m/d) Controlling &amp; Finance\nFinance Expert (m/w/d) Prozesse im Accounting &amp; Reporting\n\n\nJunior-Beteiligungscontroller (m/w/d)\n\n\n",
    "jobs": [
      801,
      802,
      960,
      968,
      1067,
      1076,
      1080,
      1136,
      1252,
      1253,
      1346,
      1408,
      1416,
      1522,
      1897,
      1898,
      1900,
      2047,
      2065,
      2078,
      2218,
      2219,
      2263,
      2276,
      2277,
      2519,
      2655,
      2656,
      2657
    ],
    "weight": 29
  },
  {
    "IDs": "664322,664079,664080,664138,662926,662927,662529,661616,661617",
    "lat": "49.192258099999997",
    "lng": "9.2287089000000009",
    "titel": "\nJunior Consultant SCM Strecken-/Auftragsmanagement Lidl Digital (m/w/d)\nJunior Consultant SCM Strecken-/Auftragsmanagement Lidl Digital (m/w/d)\n(Junior) BI Consultant at Lidl Onlineshop (m/f/d)\nJunior Consultant Arbeitssicherheit (m/w/d)\nJunior Consultant Arbeitssicherheit (m/w/d)\n\nJunior Anwendungsentwickler (w/m/d)\nJunior Anwendungsentwickler (w/m/d)",
    "jobs": [803, 913, 914, 957, 1686, 1687, 1886, 2135, 2136],
    "weight": 9
  },
  {
    "IDs": "664323,662757,662758,662763,662764,661883,659099,659100,654250",
    "lat": "49.440065699999998",
    "lng": "7.7491265",
    "titel": "Datenbankadministratorin / Datenbankadministrator (m/w/d)\nDiplom-Bauingenieure (FH) (m/w/d) / Bachelorabschluss der Fachrichtung Bauingenieurwesen\nDiplom-Bauingenieure (FH) (m/w/d) / Bachelorabschluss der Fachrichtung Bauingenieurwesen\n\n\n\n\n\nJunior-Beteiligungscontroller (m/w/d)",
    "jobs": [804, 1794, 1795, 1798, 1799, 2064, 2378, 2379, 2520],
    "weight": 9
  },
  {
    "IDs": "664326",
    "lat": "51.312711399999998",
    "lng": "9.4797460999999998",
    "titel": "",
    "jobs": [807],
    "weight": 1
  },
  {
    "IDs": "664330,664035,663928,663451,663452,663485,663486,663392,663277,662460,662461,662279,661996,661811,661812,659154,659155,658974,657883,656218,656219,652559,652560",
    "lat": "51.513587200000003",
    "lng": "7.4652981",
    "titel": "Objektmanagerin / Objektmanager (w/m/d)\n\nReferent (m/w/d) Geodatenmanagement Offshore-Projekte\n\n\nIT-Systemadministrator (m/w/d) Management von Energiedaten\nIT-Systemadministrator (m/w/d) Management von Energiedaten\nProjektingenieur/Projektleiter Explosionsschutz (m/w/d)\nIT-Experte (w/m/d)\nReferent (m/w/d) Projektkommunikation\nReferent (m/w/d) Projektkommunikation\n\nSoftwareentwickler*in im Bereich der Operativen Steuerung und Strategischen Planung von Materialflusssystemen\n\n\n\n\nSAP SD Berater (m/w/x)\n\n\n\nElektronik Prozessentwickler (m/w/d)\nElektronik Prozessentwickler (m/w/d)",
    "jobs": [
      811,
      975,
      1113,
      1306,
      1307,
      1335,
      1336,
      1382,
      1504,
      1912,
      1913,
      1940,
      2031,
      2093,
      2094,
      2381,
      2382,
      2395,
      2438,
      2496,
      2497,
      2548,
      2549
    ],
    "weight": 23
  },
  {
    "IDs": "664331,663789,663350,663351",
    "lat": "50.7753455",
    "lng": "6.0838868000000002",
    "titel": "\n\nDekanatsassistenz (m/w/d)\nDekanatsassistenz (m/w/d)",
    "jobs": [812, 1146, 1470, 1471],
    "weight": 4
  },
  {
    "IDs": "664332,664333,663961,663962,663036,662970",
    "lat": "53.550751499999997",
    "lng": "10.0017259",
    "titel": "Mitarbeiter (m/w/d) Vertrieb / digitales Marketing im Versicherungsinnendienst\nMitarbeiter (m/w/d) Vertrieb / digitales Marketing im Versicherungsinnendienst\n\n\nSystemmanagerin Access &amp; Web Applications (m/w/d)\nSharePoint Online Entwicklerin (m/w/d)",
    "jobs": [813, 814, 1006, 1007, 1597, 1652],
    "weight": 6
  },
  {
    "IDs": "664335,664336",
    "lat": "49.951681200000003",
    "lng": "8.3228728000000007",
    "titel": "Junior IT-Projekt-Manager (m/w/d)\nJunior IT-Projekt-Manager (m/w/d)",
    "jobs": [815, 816],
    "weight": 2
  },
  {
    "IDs": "664337",
    "lat": "47.646049499999997",
    "lng": "9.6299240000000008",
    "titel": "Webentwickler / UX-Designer (m/w/d) HTML / CSS",
    "jobs": [817],
    "weight": 1
  },
  {
    "IDs": "664273,663353,663356,663335,663160,662986,662564,662342,662184,662187,662190,662249,662250,659936,660022,660039,660040,660041,659932",
    "lat": "49.5682987",
    "lng": "10.882857700000001",
    "titel": "\nIngenieur Software-Prozesse und -Tools (m/w/d)\nSoftware Test Engineer Chassis R&amp;D Steer-by-Wire Automotive (m/w/d)\nAzure Active Directory Professional (m/w/d)\nFunktionssoftwareentwickler Steer-by-Wire (m/w/d)\nFunktionsverantwortlicher Gesamtfahrzeug Fahrwerk (m/w/d)\nSoftwareentwickler Funktionale Sicherheit Fahrwerksaktuatoren Automotive (m/w/d)\nBasissoftwareentwickler Fahrwerksaktuatoren/Lenkungssysteme Automotive (m/w/d)\n\n\nSoftware-Testingenieur Steer-by-Wire Automotive (m/w/d)\nFunktionssoftwareentwickler Hinterachslenkung Automotive (m/w/d)\nFunktionssoftwareentwickler Steer-by-Wire (m/w/d)\nIngenieur Software-Build-Engineering Steer-by-Wire (m/w/d)\n\nBasissoftwareentwickler Fahrwerksaktuatoren Automotive (m/w/d)\nSoftwareintegrator Steer-by-Wire (m/w/d)\nSoftware Build Engineer Steer-by-Wire (m/w/d)\nTestmanager Elektronik/Mechatronik Automotive (m/w/d)",
    "jobs": [
      820,
      1418,
      1419,
      1457,
      1560,
      1668,
      1891,
      1920,
      1963,
      1964,
      1965,
      1982,
      1983,
      2255,
      2273,
      2280,
      2281,
      2282,
      2312
    ],
    "weight": 19
  },
  {
    "IDs": "664199,663502,663407,662115,662116,661608",
    "lat": "48.107317500000001",
    "lng": "11.3983182",
    "titel": "Wirtschaftsinformatiker (m/w/d)\nSenior Security Analyst / Threat Hunter (m/w/d)\n\nMitarbeiter (m/w/d) Projektcontrolling &amp; -abrechnung\nMitarbeiter (m/w/d) Projektcontrolling &amp; -abrechnung\nNaturwissenschaftler / Ingenieur der Fachrichtungen Biologie / Biotechnologie / Medizin (m/w/d)",
    "jobs": [821, 1348, 1393, 2026, 2027, 2132],
    "weight": 6
  },
  {
    "IDs": "664205,663329",
    "lat": "47.857127200000001",
    "lng": "12.1181047",
    "titel": "\n",
    "jobs": [827, 1453],
    "weight": 2
  },
  {
    "IDs": "664206,663885,663886,663888,663116,659689",
    "lat": "51.830816599999999",
    "lng": "12.2423302",
    "titel": "Referent operative QA (m/w/d)\nQualifizierungsingenieur Technische QA (m/w/d)\nQualifizierungsingenieur Technische QA (m/w/d)\nBetriebsingenieur (m/w/d)\nQualifizierungsingenieur (m/w/d)\nExpert Dataintegrity (m/w/d)",
    "jobs": [828, 1078, 1079, 1081, 1581, 2341],
    "weight": 6
  },
  {
    "IDs": "664207",
    "lat": "48.862912700000003",
    "lng": "9.1784730000000003",
    "titel": "",
    "jobs": [829],
    "weight": 1
  },
  {
    "IDs": "664208,654492",
    "lat": "49.146538800000002",
    "lng": "8.4644508999999992",
    "titel": "Mitarbeiter/in im Bereich Klimaschutz (m/w/d)\nAnwendungsentwickler SAP UI5 (w|m|d)",
    "jobs": [830, 2516],
    "weight": 2
  },
  {
    "IDs": "664209,660196,660197,660025",
    "lat": "48.230350299999998",
    "lng": "9.8829174000000002",
    "titel": "HR Business Partner Schwerpunkt Controlling (m/w/d)\nInfrastructure Operations Specialist (m/w/d)\nInfrastructure Operations Specialist (m/w/d)\nSAP HCM / SuccessFactors Berater (m/w/x)",
    "jobs": [831, 2237, 2238, 2274],
    "weight": 4
  },
  {
    "IDs": "664210",
    "lat": "49.339074500000002",
    "lng": "10.791975300000001",
    "titel": "Produktmanager Fahrradtaschen (m/w/d)",
    "jobs": [832],
    "weight": 1
  },
  {
    "IDs": "664211",
    "lat": "52.103761400000003",
    "lng": "9.3661013999999998",
    "titel": "Technischer Sachbearbeiter (m/w/d) Dipl.-Ing. (FH) oder Bachelor/Master of Engineering",
    "jobs": [833],
    "weight": 1
  },
  {
    "IDs": "664226,664227,663993,663506,663309,663315",
    "lat": "48.624420999999998",
    "lng": "9.3469069000000005",
    "titel": "Bachelor of Arts - Public Management / Diplom-Verwaltungswirt (m/w/d)\nBachelor of Arts - Public Management / Diplom-Verwaltungswirt (m/w/d)\nPromotion Manager (m/w/d) Vertrieb\nBusiness Analyst (m/w/d)\n\n",
    "jobs": [836, 837, 1028, 1352, 1435, 1440],
    "weight": 6
  },
  {
    "IDs": "664228",
    "lat": "53.543590799999997",
    "lng": "10.216594300000001",
    "titel": "Webdeveloper/-in (m/w/d)",
    "jobs": [838],
    "weight": 1
  },
  {
    "IDs": "664229,663808,663403,660440,659739,659740",
    "lat": "52.532614000000002",
    "lng": "13.3777036",
    "titel": "Mitarbeiter (m/w/d) Controlling\nProjektkoordinator (m/w/d)\n\nPersonalization Manager (m/w/d) E-Commerce\nInformatiker / Fachinformatiker (w/m/d) mit Schwerpunkt Informationssicherheit\nInformatiker / Fachinformatiker (w/m/d) mit Schwerpunkt Informationssicherheit",
    "jobs": [839, 1164, 1390, 2192, 2348, 2349],
    "weight": 6
  },
  {
    "IDs": "664230,664231,663411,662978,659639",
    "lat": "49.472339499999997",
    "lng": "10.993087600000001",
    "titel": "Financial Analyst (m/w/d)\nBusiness Analyst (m/w/d)\nInvestment Analyst (m/w/d)\nGebietsverkaufsleiter (m/w/d)\nSAP HCM (Senior) Berater (m/w/x) mit Schwerpunkt PY oder PT",
    "jobs": [840, 841, 1397, 1660, 2329],
    "weight": 5
  },
  {
    "IDs": "664233,663467",
    "lat": "51.434407899999997",
    "lng": "6.7623293000000002",
    "titel": "\nTransaktionsmanager (m/w/d)",
    "jobs": [843, 1318],
    "weight": 2
  },
  {
    "IDs": "664234,659724",
    "lat": "49.4861656",
    "lng": "8.4702616000000006",
    "titel": "Referent Sicherheitstechnik (Dipl.-Ing./M.Sc.) (m/w/d)\nProjektleiter ERP (m/w/d)",
    "jobs": [844, 2344],
    "weight": 2
  },
  {
    "IDs": "664235,663792,663793,662136,662137",
    "lat": "49.872825300000002",
    "lng": "8.6511928999999999",
    "titel": "Projektsteuerer (m/w/d) Verkehrsinfrastruktur\nDrohnenpilot (m/w/d)\nDrohnenpilot (m/w/d)\nWissenschaftliche*r Mitarbeiter*in im Bereich Cybersicherheit\nWissenschaftliche*r Mitarbeiter*in im Bereich Cybersicherheit",
    "jobs": [845, 1149, 1150, 1993, 1994],
    "weight": 5
  },
  {
    "IDs": "664237,657598,657599",
    "lat": "48.121161000000001",
    "lng": "11.584808799999999",
    "titel": "Manager Social Media &amp; Digital Communication (m/w/d)\n\n",
    "jobs": [847, 2467, 2468],
    "weight": 3
  },
  {
    "IDs": "664240,664007,664008,663213",
    "lat": "52.515509799999997",
    "lng": "13.3847539",
    "titel": "Betriebswirtin/Betriebswirt (m/w/d), Referat Telematik, Abteilung IT-Management/Telematik\nIT-Techniker (m/w/d)\nIT-Techniker (m/w/d)\nIngenieure / Ingenieurinnen und Informatiker/innen (m/w/d) als Spezialisten / Spezialistinnen im Skilled Service Desk",
    "jobs": [850, 1042, 1043, 1535],
    "weight": 4
  },
  {
    "IDs": "664241,664242",
    "lat": "50.975431399999998",
    "lng": "11.026185099999999",
    "titel": "Krankenhausverhandler (m/w/d)\nKrankenhausverhandler (m/w/d)",
    "jobs": [851, 852],
    "weight": 2
  },
  {
    "IDs": "664245,664246",
    "lat": "50.275966500000003",
    "lng": "8.3445865000000001",
    "titel": "Softwareentwickler / Informatiker / Anwendungsentwickler / Programmierer (m/w/d)\nSoftwareentwickler / Informatiker / Anwendungsentwickler / Programmierer (m/w/d)",
    "jobs": [855, 856],
    "weight": 2
  },
  {
    "IDs": "664248,664249,664252,663909,663580,663079,663080,662973,662974,662975,662682,662683",
    "lat": "51.963008799999997",
    "lng": "7.6267551999999998",
    "titel": "\n\nAnwendungsentwickler CAD (m/w/x)\nDoktorand (m/w/d) in molekularer Reproduktionsphysiologie\nIT-Entwickler (m/w/d)\n(Junior) Produktmanager (m/w/d)\n(Junior) Produktmanager (m/w/d)\nOnline Marketing Manager (m/w/d) Fashion E-Commerce\nOnline Marketing Manager (m/w/d) Fashion E-Commerce\nMarketing Analyst Schwerpunkt Pricing (m/w/d) Fashion E-Commerce\n\n",
    "jobs": [858, 859, 862, 1096, 1282, 1633, 1634, 1655, 1656, 1657, 1822, 1823],
    "weight": 12
  },
  {
    "IDs": "664250,664251,663572,663573",
    "lat": "54.323923999999998",
    "lng": "10.1315442",
    "titel": "Personalberater (m/w/d) Bildung und Soziales\nPersonalberater (m/w/d) Bildung und Soziales\nProvidermanager IT (w/m/d)\nIT-Implementierungsmanager (w/m/d)",
    "jobs": [860, 861, 1274, 1275],
    "weight": 4
  },
  {
    "IDs": "664253,664043,663972,663973,663974,663977,663742,659988,657480,657150,656245",
    "lat": "48.191821599999997",
    "lng": "11.656944899999999",
    "titel": "\nJunior Presentation Planner (m/w/d)\nJunior Manager Planning Strategy &amp; Campaign Management (m/w/d)\nJunior Manager Planning Strategy &amp; Campaign Management (m/w/d)\nProject Manager Sky Channels (m/w/d)\nManager Metadata Management (m/w/d)\n(Junior) Online Marketing Manager (m/w/d)\nDeveloper STB Applications (m/w/d)\nManager Operations Control (m/w/d)\n\nManager DevOps Management (m/w/d)",
    "jobs": [863, 982, 1010, 1011, 1012, 1015, 1243, 2267, 2472, 2475, 2500],
    "weight": 11
  },
  {
    "IDs": "664254,663192,662989,662990",
    "lat": "50.146746899999997",
    "lng": "8.5614554999999992",
    "titel": "Spezialist (m/w/d) Verhandlungsmanagement im Bereich Hilfsmittel\n\nWirtschaftswissenschaftler (m/w/d) Vertrags-/Verhandlungsmanagement\nWirtschaftswissenschaftler (m/w/d) Vertrags-/Verhandlungsmanagement",
    "jobs": [864, 1518, 1671, 1672],
    "weight": 4
  },
  {
    "IDs": "664255,664256",
    "lat": "48.566736400000003",
    "lng": "13.4319466",
    "titel": "\n",
    "jobs": [865, 866],
    "weight": 2
  },
  {
    "IDs": "664257,661613,660359,652786,652787",
    "lat": "48.681331200000002",
    "lng": "9.0088299000000003",
    "titel": "Ingenieur modellbasierte Entwicklung/Embedded Programmierung (m/w/d)\nFinance Representative Fixed Asset &amp; Accounting (m/f/d)\nMechanical Design Engineer (m/f/d)\nApplikationsingenieur (m/w/d) Hardware-in-the-Loop\nApplikationsingenieur (m/w/d) Hardware-in-the-Loop",
    "jobs": [867, 2133, 2167, 2542, 2543],
    "weight": 5
  },
  {
    "IDs": "664264,663594",
    "lat": "50.075119000000001",
    "lng": "8.8572968999999997",
    "titel": "Bilanzbuchhalter (m/w/d)\nProduktmanager Energie (w/m/d)",
    "jobs": [872, 1292],
    "weight": 2
  },
  {
    "IDs": "664265",
    "lat": "51.663333999999999",
    "lng": "6.6192247000000002",
    "titel": "Informatiker/in als Inhouse Consultant (m/w/d) Dokumentenmanagement und Workflow-Entwicklung",
    "jobs": [873],
    "weight": 1
  },
  {
    "IDs": "664269,664270,664062,663786,663715,663586,662902,662910,662685,662686,662247,662248,662254,662118,661773,659953,660031,660032",
    "lat": "51.227741100000003",
    "lng": "6.7734556000000001",
    "titel": "Mitarbeiterin / Mitarbeiter (w/m/d) im Fachbereich Strategie, Prozesse, Fachcontrolling\n\nSoftwareentwickler (m/w/d) JavaScript / SQL\nFondsmanager (m/w/d)\nMarketing &amp; Communication Specialist (m/w/d)\nKalkulator (m/w/d) elektrische TGA\nBusiness Analyst (m/w/d)\nBrand Manager (m/w/d)\nSAP Fiori / UI5 Entwickler (m/w/x)\nSAP Fiori / UI5 Entwickler (m/w/x)\nProcurement Analyst (m/w/d) als Sachbearbeiter Einkauf / Beschaffung\nProcurement Analyst (m/w/d) als Sachbearbeiter Einkauf / Beschaffung\n\nEDI Koordinator/in (m/w/d)\nSecurity Architekt (m/w/d)\nSAP ABAP Entwickler (m/w/x)\nSystemadministrator Cloud (w/m/d)\nSystemadministrator Cloud (w/m/d)",
    "jobs": [
      877,
      878,
      1050,
      1143,
      1219,
      1285,
      1727,
      1733,
      1825,
      1826,
      1980,
      1981,
      1986,
      2028,
      2083,
      2257,
      2278,
      2279
    ],
    "weight": 18
  },
  {
    "IDs": "664159,664160,664169,664170,664173",
    "lat": "48.213276700000002",
    "lng": "11.5563264",
    "titel": "\n\n\n\n",
    "jobs": [880, 881, 890, 891, 894],
    "weight": 5
  },
  {
    "IDs": "664163,664164",
    "lat": "48.220227000000001",
    "lng": "11.5761802",
    "titel": "\n",
    "jobs": [884, 885],
    "weight": 2
  },
  {
    "IDs": "664065,664066,663123,662503",
    "lat": "50.927053999999998",
    "lng": "11.589237199999999",
    "titel": "Chemisch-Technische/r Assistent/-in (w/div/m)\nChemisch-Technische/r Assistent/-in (w/div/m)\nProjektleiter ERP (Administrator) (m/w/d)\nSpecialist Service Disposition (w/m/d)",
    "jobs": [899, 900, 1585, 1877],
    "weight": 4
  },
  {
    "IDs": "664067",
    "lat": "48.880051100000003",
    "lng": "9.2807955999999994",
    "titel": "Product Quality Engineer (m/f/d)",
    "jobs": [901],
    "weight": 1
  },
  {
    "IDs": "664068,664069",
    "lat": "48.709837700000001",
    "lng": "9.6531604000000009",
    "titel": "Sachbearbeiter (m/w/d) Wohngeld\nSachbearbeiter (m/w/d) Wohngeld",
    "jobs": [902, 903],
    "weight": 2
  },
  {
    "IDs": "664073,664074",
    "lat": "49.300424599999999",
    "lng": "10.571935699999999",
    "titel": "IT-Prozessmanager (m/w/d)\nIT-Prozessmanager (m/w/d)",
    "jobs": [907, 908],
    "weight": 2
  },
  {
    "IDs": "664077,664078,663825,663628,663466,663306,663230,663231,663260,663280,662952,662905,662455,662336,662077,659929,659930,659779,659707",
    "lat": "50.937531",
    "lng": "6.9602785999999996",
    "titel": "Mitarbeiter Affiliate Marketing (m/w/d)\nMitarbeiter Affiliate Marketing (m/w/d)\nDV-Administrator/in (m/w/d)\nProjektsteuerer Medizintechnik Bau (im Home Office) (m/w/d)\nSpezialist (m/w/d) Nachlassmarketing / Fundraising\nSafety Manager (m/w/d)\n\n\nCloud Entwickler - Customer Engagement (w/m/d)\nArchitekt (m/w/d)\nProjektmanager (m/w/d) Finance/Accounting - Global Business Services\n\nSAP SD / MM Berater (m/w/x)\nFachplaner/Fachplanerin TGA (m/w/d)\nBusiness Development Manager (m/w/divers)\nSHE Ingenieur (m/w/d)\nSHE Ingenieur (m/w/d)\nIT Security Architect (m/w/d)\nSAP SD Berater (m/w/x)",
    "jobs": [
      911,
      912,
      1176,
      1177,
      1317,
      1432,
      1478,
      1479,
      1492,
      1506,
      1640,
      1730,
      1910,
      1962,
      2099,
      2310,
      2311,
      2318,
      2343
    ],
    "weight": 19
  },
  {
    "IDs": "664081,663549,657749,657776,657777",
    "lat": "48.390604199999999",
    "lng": "10.0060398",
    "titel": "Facility Manager (m/w/d)\nOecotrophologe als Produktmanager / Vertrieb (m/w/d)\nIngenieur Reliability Safety Engineering (m/w/d)\nSystemtester Embedded Realtime (m/w/d)\nSystemtester Embedded Realtime (m/w/d)",
    "jobs": [915, 1260, 2443, 2446, 2447],
    "weight": 5
  },
  {
    "IDs": "664082",
    "lat": "50.850704200000003",
    "lng": "13.775778799999999",
    "titel": "Webentwickler (m/w/d)",
    "jobs": [916],
    "weight": 1
  },
  {
    "IDs": "664083",
    "lat": "48.158269099999998",
    "lng": "11.5786882",
    "titel": "Marketing Manager (m/w/d)",
    "jobs": [917],
    "weight": 1
  },
  {
    "IDs": "664088,663695,663386,663400,662794",
    "lat": "50.9386437",
    "lng": "6.9538846999999997",
    "titel": "PHP Symfony Entwickler (w/m/d)\nProjektmanager ERP - MS Dynamics NAV (m/w/x)\nBetriebsingenieur (m/w/d) Verfahrenstechnik\nSAP C/4HANA (Senior) Entwickler SAP C4C Sales/Service (m/w/d)\nTechnical Consultant Digitalisierung SAP (m/w/d)",
    "jobs": [918, 1203, 1378, 1388, 1763],
    "weight": 5
  },
  {
    "IDs": "664089,664090",
    "lat": "49.7586035",
    "lng": "9.5128511000000007",
    "titel": "Project Manager Product Development (m/w/d)\nProject Manager Product Development (m/w/d)",
    "jobs": [919, 920],
    "weight": 2
  },
  {
    "IDs": "664091,664092",
    "lat": "48.988221899999999",
    "lng": "12.1020638",
    "titel": "Softwareentwickler (m/w/d)\nSoftwareentwickler (m/w/d)",
    "jobs": [921, 922],
    "weight": 2
  },
  {
    "IDs": "664093",
    "lat": "48.825927999999998",
    "lng": "10.1004936",
    "titel": "Projektmitarbeiter Veranstaltungsmanagement (m/w/d)",
    "jobs": [923],
    "weight": 1
  },
  {
    "IDs": "664096,664097",
    "lat": "52.262362099999997",
    "lng": "14.0359392",
    "titel": "Berater Klinische Anwendungen i.s.h.med (m/w/d)\nBerater Klinische Anwendungen i.s.h.med (m/w/d)",
    "jobs": [924, 925],
    "weight": 2
  },
  {
    "IDs": "664098,662371",
    "lat": "52.437017900000001",
    "lng": "13.5470509",
    "titel": "Wissenschaftliche*r Mitarbeiter*in (m/w/d) der Fachrichtung Ingenieurwissenschaften, Werkstoffwissenschaften o. vglb.\nTrainee Produktmanagement Pharma Deutschland (m/w/d)",
    "jobs": [926, 1926],
    "weight": 2
  },
  {
    "IDs": "664099,664100",
    "lat": "47.839228800000001",
    "lng": "8.5347427000000007",
    "titel": "\n",
    "jobs": [927, 928],
    "weight": 2
  },
  { "IDs": "664101", "lat": "53.319398900000003", "lng": "13.8724781", "titel": "", "jobs": [929], "weight": 1 },
  {
    "IDs": "664102",
    "lat": "48.722620599999999",
    "lng": "9.1584836000000003",
    "titel": "IT Problem Manager (m/w/d)",
    "jobs": [930],
    "weight": 1
  },
  {
    "IDs": "664105",
    "lat": "52.433188600000001",
    "lng": "13.298009499999999",
    "titel": "Doktorand*in (m/w/d) in einer quantitativen Fachrichtung im Referat &quot;eScience&quot;",
    "jobs": [933],
    "weight": 1
  },
  {
    "IDs": "664109",
    "lat": "50.114956599999999",
    "lng": "8.9744604999999993",
    "titel": "Chemieingenieur / Master (m/w/d) Verfahrenstechnik oder Chemietechnik",
    "jobs": [935],
    "weight": 1
  },
  {
    "IDs": "664110,662992,661807",
    "lat": "52.137865900000001",
    "lng": "10.3899127",
    "titel": "Trainee (w/m/d) Verfahrenstechnik\nTrainee (w/m/d) Corporate Affairs mit Schwerpunkt Handelspolitik\nSAP BW / BI Berater (m/w/x)",
    "jobs": [936, 1674, 2090],
    "weight": 3
  },
  {
    "IDs": "664112,663873,663464",
    "lat": "52.164041300000001",
    "lng": "10.5408484",
    "titel": "\n\nIngenieur der Landschaftsarchitektur* (m/w/d)",
    "jobs": [938, 1066, 1315],
    "weight": 3
  },
  {
    "IDs": "664114,664115",
    "lat": "49.413513799999997",
    "lng": "8.6844798999999995",
    "titel": "Informatiker (m/w/d)\nInformatiker (m/w/d)",
    "jobs": [940, 941],
    "weight": 2
  },
  { "IDs": "664118", "lat": "50.1130657", "lng": "8.6252221000000002", "titel": "", "jobs": [943], "weight": 1 },
  {
    "IDs": "664119,664120,663571",
    "lat": "48.493678799999998",
    "lng": "9.0526060000000008",
    "titel": "\n\nSoftwareentwicklung und Fachadministration",
    "jobs": [944, 945, 1273],
    "weight": 3
  },
  {
    "IDs": "664121,664122",
    "lat": "47.696863999999998",
    "lng": "8.7550747999999992",
    "titel": "Mitarbeiter (m/w/d) Sozialdienst / Sozialarbeiter (Dipl./B.A.) (m/w/d)\nMitarbeiter (m/w/d) Sozialdienst / Sozialarbeiter (Dipl./B.A.) (m/w/d)",
    "jobs": [946, 947],
    "weight": 2
  },
  {
    "IDs": "664125,664126,663857,663858,663166,663124,662790,662712,662713",
    "lat": "52.3746255",
    "lng": "9.9784211000000003",
    "titel": "\n\nSafety Health Environment (SHE) Advisor (m/w/d) im Bereich Offshore\nSafety Health Environment (SHE) Advisor (m/w/d) im Bereich Offshore\nIngenieur Asset Management HVDC (w/m/d)\n\n\n\n",
    "jobs": [950, 951, 1060, 1061, 1565, 1586, 1760, 1844, 1845],
    "weight": 9
  },
  {
    "IDs": "664134",
    "lat": "52.589086199999997",
    "lng": "13.3032995",
    "titel": "Berater Microsoft Dynamics 365 Business Central (m/w/d)",
    "jobs": [954],
    "weight": 1
  },
  {
    "IDs": "664135,664136,663950,663951,662526,658894,658255",
    "lat": "49.1426929",
    "lng": "9.2108790000000003",
    "titel": "IT-Systemadministrator (m/w/d)\nIT-Systemadministrator (m/w/d)\nProjektingenieur (m/w/d)\nProjektingenieur (m/w/d)\nSpezialist (m/w/d) Supply Chain Management International - Sortimentsdisposition\nSAP Logistik Berater (m/w/x)\nSAP Basis Berater (m/w/x)",
    "jobs": [955, 956, 997, 998, 1883, 2399, 2421],
    "weight": 7
  },
  {
    "IDs": "664142,663763,663764,663652,660205,660206,657562",
    "lat": "52.293795199999998",
    "lng": "8.9553817999999996",
    "titel": "Produktmanager Markierungswerkstoffe (m/w/d)\nJunior SAP FI/CO Consultant (m/w/d)\nJunior SAP FI/CO Consultant (m/w/d)\nJunior Revisor (m/w/d)\nJunior Referent Konzernrechnungswesen (m/w/d)\nJunior Referent Konzernrechnungswesen (m/w/d)\nIT Consultant SAP Authorization Management (m/w/d)",
    "jobs": [961, 1121, 1122, 1197, 2241, 2242, 2461],
    "weight": 7
  },
  {
    "IDs": "664143,663581,662971,662972,661738,661739,659885,659886",
    "lat": "54.092440600000003",
    "lng": "12.099146599999999",
    "titel": "Commercial Project Manager (m/w/d)\nElectrical Works Manager (m/w/d)\n\n\nIT-Kauffrau / IT-Kaufmann (m/w/d)\nIT-Kauffrau / IT-Kaufmann (m/w/d)\n\n",
    "jobs": [962, 1283, 1653, 1654, 2115, 2116, 2299, 2300],
    "weight": 8
  },
  {
    "IDs": "664145,664146,663206,663207,662578,662579,661875",
    "lat": "53.153706999999997",
    "lng": "8.2095955000000007",
    "titel": "IT-Administrator (m/w/d) Citrix\nIT-Administrator (m/w/d) Citrix\nPersonalreferent (m/w/d)\nPersonalreferent (m/w/d)\nInformatiker (m/w/d)\nInformatiker (m/w/d)\n",
    "jobs": [963, 964, 1529, 1530, 1895, 1896, 2061],
    "weight": 7
  },
  {
    "IDs": "664148",
    "lat": "52.410735199999998",
    "lng": "13.3756523",
    "titel": "Anwendungsentwickler MS Dynamics NAV (m/w/d)",
    "jobs": [965],
    "weight": 1
  },
  {
    "IDs": "664149",
    "lat": "47.830659599999997",
    "lng": "7.9454669000000004",
    "titel": "Softwareentwickler (m/w/d)",
    "jobs": [966],
    "weight": 1
  },
  {
    "IDs": "664150,663422,663336,662608,662306,662307,662326,662178",
    "lat": "51.455619400000003",
    "lng": "7.0104543000000001",
    "titel": "Senior Key Account Manager (m/w/d)\nSpezialist Logistik- und Verpackungsplanung (m/w/d)\nCost Controller*in Digital (m/w/d)\n(Junior) IT Projektmanager*in (m/w/d)\nJungingenieur (w/m/d)\nJungingenieur (w/m/d)\nAbrechner/Abrechnerin (m/w/d)\nJunior Java Entwickler*in (m/w/d)",
    "jobs": [967, 1407, 1458, 1861, 1946, 1947, 1957, 2011],
    "weight": 8
  },
  {
    "IDs": "664029,664013,664014,663694,663740,663167,663168,662013,660288,660289",
    "lat": "48.7989751",
    "lng": "9.0657712999999998",
    "titel": "Ingenieur mit Schwerpunkt elektrische Sicherheit nach IEC 61010-1 (m/w/d)\nSystem Architect (m/w/d)\nTest-Engineer - Automated Test Systems (m/w/d)\nEntwicklungsingenieur Verfahrenstechnik / Chemie (m/d/w)\nTest-Engineer - Test Automation &amp; Software Quality (m/w/d)\nSachbearbeiter (m/w/d)\nSachbearbeiter (m/w/d)\n\nIT Network Engineer - Netzwerkadministrator (m/w/d)\nIT Network Engineer - Netzwerkadministrator (m/w/d)",
    "jobs": [971, 1048, 1049, 1202, 1241, 1566, 1567, 2032, 2209, 2210],
    "weight": 10
  },
  {
    "IDs": "664032,663311,662796",
    "lat": "51.845857500000001",
    "lng": "8.2997425000000007",
    "titel": "ERP Inhouse Consultant (m/w/d)\nTeamleiter (m/w/d) IT-Consulting ECM / DMS\nKey Account Manager (m/w/d)",
    "jobs": [972, 1437, 1764],
    "weight": 3
  },
  {
    "IDs": "664033",
    "lat": "50.261209399999998",
    "lng": "10.962695",
    "titel": "Group Accountant - internationaler Bilanzbuchhalter Konsolidierung (m/w/d)",
    "jobs": [973],
    "weight": 1
  },
  {
    "IDs": "664034",
    "lat": "48.728799100000003",
    "lng": "9.2585975999999999",
    "titel": "",
    "jobs": [974],
    "weight": 1
  },
  {
    "IDs": "664036",
    "lat": "52.225308300000002",
    "lng": "8.9402185000000003",
    "titel": "Senior Recruiter (m/w/d)",
    "jobs": [976],
    "weight": 1
  },
  {
    "IDs": "664040,663879,663880,663881,663797,660488,660489,658222",
    "lat": "50.3569429",
    "lng": "7.5889958999999996",
    "titel": "Softwareentwickler C++/COM+ (m/w/d)\n\n\n\nIT Senior-Projektmanager und -Anwendungsarchitekt (m/w/d)\n\n\nSAP CO Consultant (m/w/x)",
    "jobs": [979, 1072, 1073, 1074, 1154, 2147, 2148, 2419],
    "weight": 8
  },
  {
    "IDs": "664041,664042",
    "lat": "50.769477500000001",
    "lng": "7.1875786000000002",
    "titel": "Mitarbeiter*in Projekt- und Abteilungscontrolling\nMitarbeiter*in Projekt- und Abteilungscontrolling",
    "jobs": [980, 981],
    "weight": 2
  },
  {
    "IDs": "664046",
    "lat": "53.551177899999999",
    "lng": "9.9641759000000008",
    "titel": "Vertriebsmitarbeiter (m/w/d)",
    "jobs": [984],
    "weight": 1
  },
  {
    "IDs": "664047",
    "lat": "49.007217099999998",
    "lng": "8.3525781000000006",
    "titel": "",
    "jobs": [985],
    "weight": 1
  },
  {
    "IDs": "664048,660333",
    "lat": "52.534193600000002",
    "lng": "13.4230065",
    "titel": "Junior Social Media Manager (m/w/d)\nBrand Manager (m/w/d)",
    "jobs": [986, 2163],
    "weight": 2
  },
  {
    "IDs": "664049",
    "lat": "48.080821399999998",
    "lng": "11.286046300000001",
    "titel": "Betriebswirtinnen oder Betriebswirte - Administratives Management von Drittmittelprojekten",
    "jobs": [987],
    "weight": 1
  },
  {
    "IDs": "664050,664051,650861",
    "lat": "48.105992399999998",
    "lng": "11.4864487",
    "titel": "Finanz- und Lohnbuchhalter (m/w/d)\nFinanz- und Lohnbuchhalter (m/w/d)\n",
    "jobs": [988, 989, 2573],
    "weight": 3
  },
  {
    "IDs": "664052,664053,664054,663992,663720,663721,663547,663480,663481,663299,663183,662959,662940,662881,662259,661865,660340,660341,660235,659849,657307,654202,654203,646295",
    "lat": "50.110922100000003",
    "lng": "8.6821266999999995",
    "titel": "(Senior-) Consultant (w/m/d) Financial Industries - Schwerpunkt Insurance Krankenversicherung\n(Senior-) Consultant (w/m/d) Financial Industries - Schwerpunkt Insurance Claims Management\n(Senior-) Consultant (w/m/d) Financial Industries - Schwerpunkt Insurance Vertriebswege\nNaturwissenschaftliche Doktorandin / Naturwissenschaftlicher Doktorand\nKommunikationsdesigner oder Mediengestalter (m/w/d) Digital und Print\nKommunikationsdesigner oder Mediengestalter (m/w/d) Digital und Print\n\nIngenieur Risk Consulting (m/w/d)\nIngenieur Risk Consulting (m/w/d)\n\nPhD Studentin / PhD Student als Wissenschaftliche Mitarbeiterin / Wissenschaftlicher Mitarbeiter\n\nKlinikmanagerin / Klinikmanager\nIT-Architekt (m/w/d)\n\nSAP FI / CO Berater Job (m/w/x)\n\n\nSolution Engineer (m/w/d) - Business Automation\nIT 1st &amp; 2nd Level Support (m/w/d)\nSales Representative (m/w/d)\nSenior Consultant (m/w/d) IT-Consulting - Post-Merger Integration &amp; Carve-out\nSenior Consultant (m/w/d) IT-Consulting - Post-Merger Integration &amp; Carve-out\n",
    "jobs": [
      990,
      991,
      992,
      1027,
      1224,
      1225,
      1258,
      1330,
      1331,
      1426,
      1515,
      1644,
      1697,
      1714,
      1987,
      2054,
      2164,
      2165,
      2203,
      2291,
      2474,
      2523,
      2524,
      2628
    ],
    "weight": 24
  },
  {
    "IDs": "663934,663836,663730,663731,663732,663503,663504,663150,663151,662840",
    "lat": "52.0230903",
    "lng": "8.5337525999999997",
    "titel": "\n\n(Junior) Netzwerkadministrator (m/w/d)\n(Senior) Firewall-Administrator (m/w/d)\n(Senior) Netzwerkadministrator (m/w/d)\nSystemadministrator - Linux (m/w/d)\nSystemadministrator - Linux (m/w/d)\nProduktmanager (m/w/d)\nProduktmanager (m/w/d)\nMitarbeiter im Bereich Finanz- und Rechnungswesen (m/w/d)",
    "jobs": [996, 1055, 1232, 1233, 1234, 1349, 1350, 1550, 1551, 1787],
    "weight": 10
  },
  {
    "IDs": "663952",
    "lat": "51.288267400000002",
    "lng": "7.291086",
    "titel": "Immobilienkaufmann als Immobilienverwalter (m/w/d)",
    "jobs": [999],
    "weight": 1
  },
  {
    "IDs": "663953,663334,659219",
    "lat": "50.124861099999997",
    "lng": "8.6752345999999996",
    "titel": "Systemadministrator (m/w/d) im Windows-Umfeld\nSales Account Manager (all Gender)\n",
    "jobs": [1000, 1456, 2371],
    "weight": 3
  },
  {
    "IDs": "663954,663955",
    "lat": "54.072943100000003",
    "lng": "9.9840157999999999",
    "titel": "Erzieher (m/w/d)\nErzieher (m/w/d)",
    "jobs": [1001, 1002],
    "weight": 2
  },
  {
    "IDs": "663958",
    "lat": "49.9406587",
    "lng": "8.2607043999999998",
    "titel": "Construction Manager / Bauleiter (m/w/d)",
    "jobs": [1003],
    "weight": 1
  },
  {
    "IDs": "663959",
    "lat": "48.136597899999998",
    "lng": "11.630743900000001",
    "titel": "Technical Support Specialist (m/w/d) (Video Software)",
    "jobs": [1004],
    "weight": 1
  },
  {
    "IDs": "663960",
    "lat": "49.467722000000002",
    "lng": "11.147402400000001",
    "titel": "Data Engineer (d/m/w)",
    "jobs": [1005],
    "weight": 1
  },
  {
    "IDs": "663970",
    "lat": "52.035394400000001",
    "lng": "6.8245487000000002",
    "titel": "Ganzheitlicher Produktmanager (m/w/div)",
    "jobs": [1008],
    "weight": 1
  },
  {
    "IDs": "663975",
    "lat": "48.547678400000002",
    "lng": "7.9744954000000003",
    "titel": "Bilanzbuchhalter (m/w/d)",
    "jobs": [1013],
    "weight": 1
  },
  {
    "IDs": "663976,663781,663059,662566,662567,657076,654568,652675",
    "lat": "51.339695499999998",
    "lng": "12.3730747",
    "titel": "Datenmanager oder Data Analyst (w/m/d)\n\nJavaScript Entwickler (m/w/d)\nJava Entwickler (m/w/d)\nJava Entwickler (m/w/d)\n\nAutomatisierungstechniker (m/w/d) SPS / Robotik\n",
    "jobs": [1014, 1138, 1613, 1892, 1893, 2478, 2513, 2547],
    "weight": 8
  },
  {
    "IDs": "663978,663766,663649,663704,663705,663706,663707,663613,663614,663347,663262,663178,663179,663141,663142,663064,662791,662792,662725,662726,662263,661910,661911,660198,660199,659955",
    "lat": "48.782702700000002",
    "lng": "9.1828631000000005",
    "titel": "\nSales Manager (m/w/d) IT-Projekte Automotive\n\nIngenieur/-in (m/w/d)\nIngenieur/-in (m/w/d)\nSoftwareingenieur/-in Java (m/w/d)\nSoftwareingenieur/-in Java (m/w/d)\n\n\n\nIT-Systemadministrator / DevOps Engineer (m/w/d) Service Operations\n\n\n(Junior) Consultant / Aktuar (m/w/d)\n(Junior) Consultant / Aktuar (m/w/d)\nReferent (m/w/d) Sonderaufgaben Prognosen und Algorithmen\nBauingenieurinnen / Bauingenieure (w/m/d)\nBauingenieurinnen / Bauingenieure (w/m/d)\nFundraising-Referent (m/w/d)\nFundraising-Referent (m/w/d)\nBusiness Analyst / IT-Consultant (m/w/d) - Lending\nJava EE Developer im Versicherungsumfeld (m/w/d)\nIT-Allrounder (m/w/d)\nProjektmitarbeiter im Vergabemanagement (m/w/d)\nProjektmitarbeiter im Vergabemanagement (m/w/d)\nFinanzbuchhalter/-in (w/m/d)",
    "jobs": [
      1016,
      1124,
      1194,
      1212,
      1213,
      1214,
      1215,
      1249,
      1250,
      1467,
      1493,
      1512,
      1513,
      1541,
      1542,
      1618,
      1761,
      1762,
      1853,
      1854,
      1989,
      2075,
      2076,
      2239,
      2240,
      2259
    ],
    "weight": 26
  },
  {
    "IDs": "663979,663980,660077",
    "lat": "47.970959899999997",
    "lng": "8.8117804999999993",
    "titel": "\n\nSAP Logistik Berater (m/w/x) mit Perspektive Teamleitung",
    "jobs": [1017, 1018, 2246],
    "weight": 3
  },
  { "IDs": "663982", "lat": "53.494932400000003", "lng": "10.0319897", "titel": "", "jobs": [1019], "weight": 1 },
  {
    "IDs": "663984,663911,663912",
    "lat": "53.570290999999997",
    "lng": "9.8826237999999993",
    "titel": "Administratorin (w/m/d) Datenbank- und Applikationsserver\nVerwaltungsangestellte (w/m/d) fu&amp;#776;r die Finanzplanung\nVerwaltungsangestellte (w/m/d) fu&amp;#776;r die Finanzplanung",
    "jobs": [1021, 1098, 1099],
    "weight": 3
  },
  {
    "IDs": "663985,663986,664001",
    "lat": "48.1234082",
    "lng": "11.6120973",
    "titel": "\n\nProduktmanager / Vertriebsmitarbeiter (m/w/d)",
    "jobs": [1022, 1023, 1036],
    "weight": 3
  },
  {
    "IDs": "663987,663988,663884,663811,663050,663051,662991,662995",
    "lat": "49.016864200000001",
    "lng": "12.097408100000001",
    "titel": "\n\n\n\n\n\n\n",
    "jobs": [1024, 1025, 1077, 1167, 1607, 1608, 1673, 1677],
    "weight": 8
  },
  {
    "IDs": "663994",
    "lat": "48.043005299999997",
    "lng": "7.8205932000000002",
    "titel": "Nachhaltigkeitsmanager Textil (m/w/d)",
    "jobs": [1029],
    "weight": 1
  },
  {
    "IDs": "663996,663997",
    "lat": "51.207521100000001",
    "lng": "6.7063135000000003",
    "titel": "Quereinstieg in den Erzieherberuf (m/w/d)\nQuereinstieg in den Erzieherberuf (m/w/d)",
    "jobs": [1031, 1032],
    "weight": 2
  },
  {
    "IDs": "664000",
    "lat": "50.502222000000003",
    "lng": "7.4972219999999998",
    "titel": "IT-Spezialist (m/w/d) / Softwareentwickler",
    "jobs": [1035],
    "weight": 1
  },
  { "IDs": "664002", "lat": "52.108272599999999", "lng": "9.362171", "titel": "", "jobs": [1037], "weight": 1 },
  {
    "IDs": "664003,664004,663762,656437",
    "lat": "48.074703300000003",
    "lng": "11.671462200000001",
    "titel": "\n\n\nErzieherin (m/w/d) Kindergarten",
    "jobs": [1038, 1039, 1120, 2493],
    "weight": 4
  },
  {
    "IDs": "664005,664006",
    "lat": "53.674440199999999",
    "lng": "10.235383799999999",
    "titel": "\n",
    "jobs": [1040, 1041],
    "weight": 2
  },
  {
    "IDs": "664009,664010,663505",
    "lat": "49.978194799999997",
    "lng": "9.1665422000000003",
    "titel": "\n\n",
    "jobs": [1044, 1045, 1351],
    "weight": 3
  },
  {
    "IDs": "664012,663410,663426,663314,663316,663317,663320,663073,662931,662896,661841,661842,661603,659347,658643,658455,658456,652398",
    "lat": "50.737430000000003",
    "lng": "7.0982067999999998",
    "titel": "IT-Administrator (m/w/d)\nProjektleiter / Architekt im Bereich von Liegenschaften (m/w/d)\nBauingenieur (m/w/d)\nIT-Administrator (m/w/d) - Server- und Virtualisierungssysteme\nIT-Systemadministrator (w/m/d) Schwerpunkt Applikationsbetreuung\nSAP-Systembetreuer (m/w/d) - Core Module\nSAP-Systembetreuer (m/w/d) - IS-U (Energiewirtschaft)\nNetzplaner Strom (m/w/d)\nSachbearbeiter (m/w/d) Einkauf\nJunior Produktmanager (m/w/d)\n\n\nLeitung IT Infrastruktur (m/w/d)\nSozialarbeiter/in (m/w/d)\nSAP ABAP Entwickler (m/w/x)\n\n\nDevOps Engineer (m/w/d) Schwerpunkt Containerplattformen",
    "jobs": [
      1047,
      1396,
      1410,
      1439,
      1441,
      1442,
      1445,
      1627,
      1688,
      1723,
      2049,
      2050,
      2128,
      2369,
      2408,
      2414,
      2415,
      2559
    ],
    "weight": 18
  },
  {
    "IDs": "663832",
    "lat": "49.440319799999997",
    "lng": "11.8633445",
    "titel": "Dipl. Ingenieur / Bachelor / Techniker / Meister (m/w/d) Elektrotechnik",
    "jobs": [1051],
    "weight": 1
  },
  {
    "IDs": "663833,640647,640648",
    "lat": "52.7439161",
    "lng": "13.361489799999999",
    "titel": "Teamleiterin/Teamleiter Dezentrales Controlling (m/w/d)\n\n",
    "jobs": [1052, 2638, 2639],
    "weight": 3
  },
  {
    "IDs": "663834,663835",
    "lat": "53.5754959",
    "lng": "10.0807485",
    "titel": "Softwareentwickler (m/w/d) Webanwendungen im Automotive-Umfeld\nSoftwareentwickler (m/w/d) Webanwendungen im Automotive-Umfeld",
    "jobs": [1053, 1054],
    "weight": 2
  },
  {
    "IDs": "663853,663854",
    "lat": "51.534528399999999",
    "lng": "9.9342311999999993",
    "titel": "\n",
    "jobs": [1056, 1057],
    "weight": 2
  },
  {
    "IDs": "663855",
    "lat": "48.8405086",
    "lng": "9.2677631999999992",
    "titel": "Bauingenieur / Bautechniker als Kalkulator (m/w/d) Schwerpunkt Rohbau",
    "jobs": [1058],
    "weight": 1
  },
  {
    "IDs": "663856",
    "lat": "50.741945700000002",
    "lng": "7.0950366999999996",
    "titel": "Junior-Advisor (m/f/d) for digital health and social protection",
    "jobs": [1059],
    "weight": 1
  },
  {
    "IDs": "663859,663860,663923,663582,661760,661809",
    "lat": "54.323292700000003",
    "lng": "10.122765100000001",
    "titel": "Bau-Projektleiter Beweissicherung (m/w/d)\nBau-Projektleiter Beweissicherung (m/w/d)\nBewilliger (w/m/d)\nSoftwareentwickler Angular &amp; NestJS (w/m/d)\n\nSAP Logistik Berater (m/w/x)",
    "jobs": [1062, 1063, 1108, 1284, 2077, 2092],
    "weight": 6
  },
  {
    "IDs": "663871",
    "lat": "52.517082600000002",
    "lng": "13.323661100000001",
    "titel": "Personalberater (m/w/d) Disposition und Vertrieb",
    "jobs": [1064],
    "weight": 1
  },
  {
    "IDs": "663872",
    "lat": "50.004230399999997",
    "lng": "9.0658931999999997",
    "titel": "SAP Key User / Operation Planner (m/w/d) for Processes",
    "jobs": [1065],
    "weight": 1
  },
  {
    "IDs": "663889,663890,662261,659675",
    "lat": "49.306368900000002",
    "lng": "8.6427692999999994",
    "titel": "\n\nSAP FI Berater Job (m/w/x)\nTechnical Consultant - Healthcare IT (m/w/d)",
    "jobs": [1082, 1083, 1988, 2334],
    "weight": 4
  },
  {
    "IDs": "663893",
    "lat": "48.090513600000001",
    "lng": "11.4029843",
    "titel": "Systems Engineer / Requirements Engineer (m/w/d) Charging Systems",
    "jobs": [1085],
    "weight": 1
  },
  {
    "IDs": "663894,663895",
    "lat": "48.937013299999997",
    "lng": "9.2672764000000001",
    "titel": "\n",
    "jobs": [1086, 1087],
    "weight": 2
  },
  {
    "IDs": "663896,663897",
    "lat": "49.653469800000003",
    "lng": "9.9451830000000001",
    "titel": "Software- und Inbetriebnahme Ingenieur (w/m/d)\nSoftwareentwickler (w/m/d) Produktentwicklung",
    "jobs": [1088, 1089],
    "weight": 2
  },
  {
    "IDs": "663898",
    "lat": "47.889601900000002",
    "lng": "7.6548717000000002",
    "titel": "Kundenmanager/in (m/w/d) Schwerpunkt Kundenbetreuung und Seminarberatung",
    "jobs": [1090],
    "weight": 1
  },
  {
    "IDs": "663899",
    "lat": "48.134035500000003",
    "lng": "11.557173199999999",
    "titel": "",
    "jobs": [1091],
    "weight": 1
  },
  {
    "IDs": "663900",
    "lat": "50.940108600000002",
    "lng": "6.8851367999999997",
    "titel": "",
    "jobs": [1092],
    "weight": 1
  },
  {
    "IDs": "663901",
    "lat": "51.090209399999999",
    "lng": "6.5858629999999998",
    "titel": "SAP Inhouse Consultant (m/w/d)",
    "jobs": [1093],
    "weight": 1
  },
  {
    "IDs": "663907,663908,663136,660375,660376,657507",
    "lat": "48.089721300000001",
    "lng": "9.8079239000000005",
    "titel": "Konstruktionsingenieur (m/w/d) Serienbetreuung\nKonstruktionsingenieur (m/w/d) Serienbetreuung\nBaugrundingenieur / Geologe (w/m/d) Baugrundbewertung und Geotechnik\nProzessmanager (w/m/d) Wertstrom\nProzessmanager (w/m/d) Wertstrom\nSAP Logistik Berater (m/w/x) - SAP SD / MM / PP Consultant - SAP Logistik Inhouse Position",
    "jobs": [1094, 1095, 1536, 2168, 2169, 2473],
    "weight": 6
  },
  {
    "IDs": "663910,661771,661772",
    "lat": "53.608537200000001",
    "lng": "10.067519300000001",
    "titel": "Ingenieur Assetmanagement Stromnetz (w/m/d)\n\n",
    "jobs": [1097, 2081, 2082],
    "weight": 3
  },
  {
    "IDs": "663919,663817",
    "lat": "53.865467299999999",
    "lng": "10.686559300000001",
    "titel": "\nIngenieur* im Bereich Automatisierung",
    "jobs": [1104, 1171],
    "weight": 2
  },
  {
    "IDs": "663922,660177",
    "lat": "48.392038800000002",
    "lng": "9.9716658000000002",
    "titel": "Recruitment Consultant (m/w/d) Bildung und Soziales\nIndustrial Engineer (m/w/d) -Prozessoptimierung",
    "jobs": [1107, 2236],
    "weight": 2
  },
  {
    "IDs": "663924",
    "lat": "49.0701562",
    "lng": "9.0003913999999998",
    "titel": "SAP B1 (HANA) Programmierer oder Entwickler (Junior-Level) (m/w/d)",
    "jobs": [1109],
    "weight": 1
  },
  {
    "IDs": "663925,663926",
    "lat": "48.311464800000003",
    "lng": "11.9188758",
    "titel": "\n",
    "jobs": [1110, 1111],
    "weight": 2
  },
  {
    "IDs": "663927,663518,663519,662679,662680,657439",
    "lat": "49.317276499999998",
    "lng": "8.4412172000000005",
    "titel": ".NET Anwendungsentwickler (m/w/d)\nBauingenieur (m/w/d) der Fachrichtung Bauingenieurwesen\nBauingenieur (m/w/d) der Fachrichtung Bauingenieurwesen\nBusiness Intelligence Developer (w/m/d)\nBusiness Intelligence Developer (w/m/d)\nMaster der Betriebswirtschaft, Schwerpunkt Controlling (m/w/d)",
    "jobs": [1112, 1360, 1361, 1819, 1820, 2469],
    "weight": 6
  },
  {
    "IDs": "663929,663930,663569,663326",
    "lat": "48.801542300000001",
    "lng": "9.5296199999999995",
    "titel": "Junior Projektmanager (m/w/d)\nJunior Projektmanager (m/w/d)\nTrainee (m/w/d) im Bereich Bachelor of Arts - Public Management\n",
    "jobs": [1114, 1115, 1271, 1450],
    "weight": 4
  },
  {
    "IDs": "663931,663932,663297",
    "lat": "48.668380499999998",
    "lng": "9.3909324000000005",
    "titel": "\n\n",
    "jobs": [1116, 1117, 1424],
    "weight": 3
  },
  {
    "IDs": "663830,663831,663791",
    "lat": "48.506938900000002",
    "lng": "9.2038042999999998",
    "titel": "E-Commerce / Online Shop Manager (m/w/d)\nE-Commerce / Online Shop Manager (m/w/d)\nSenior Key Account Manager (m/w/d)",
    "jobs": [1118, 1119, 1148],
    "weight": 3
  },
  { "IDs": "663765", "lat": "49.120080199999997", "lng": "10.7318864", "titel": "", "jobs": [1123], "weight": 1 },
  {
    "IDs": "663767",
    "lat": "48.117091799999997",
    "lng": "7.8539047000000002",
    "titel": "Teamleiter (m/w/d) Rechnungs- und Finanzwesen",
    "jobs": [1125],
    "weight": 1
  },
  { "IDs": "663768", "lat": "48.144581199999998", "lng": "11.5895274", "titel": "", "jobs": [1126], "weight": 1 },
  {
    "IDs": "663769",
    "lat": "49.456400600000002",
    "lng": "8.4870172999999998",
    "titel": "Produktmanager Eigenmarken (m/w/d)",
    "jobs": [1127],
    "weight": 1
  },
  {
    "IDs": "663773,663774,663775,662621,662622,659878,659568,659591,658805,657895,657896,657904,657905,657550,652663",
    "lat": "51.718920500000003",
    "lng": "8.7575093000000006",
    "titel": "Radverkehrsplaner*in (m/w/d)\nRadverkehrsplaner*in (m/w/d)\nVerkehrsplaner*in (m/w/d)\nSystemadministrator (m/w/d) Web Development\nWebentwickler (m/w/d) Backend - CMS-Development\n\nBautechniker / Bauingenieur als Kalkulator Fachrichtung Tiefbau (w/m/d)\nBauingenieur / Architekt (m/w/d) Akquisition / Kalkulation\nFullstack Developer (m/f/x)\n\n\nSoftwareentwickler*in\nSoftwareentwickler*in\nJunior Java-Softwareentwickler (m/w)\nBauingenieur / Architekt / Bautechniker Ausschreibung + Vergabe (w/m/d)",
    "jobs": [1131, 1132, 1133, 1870, 1871, 2297, 2350, 2353, 2400, 2439, 2440, 2441, 2442, 2459, 2544],
    "weight": 15
  },
  {
    "IDs": "663777,663325",
    "lat": "49.396423400000003",
    "lng": "7.0229606999999996",
    "titel": "(Senior) Consultant Microsoft 365 / Azure (m/w/d)\nSales Manager / Key Account Manager (m/w/d)",
    "jobs": [1135, 1449],
    "weight": 2
  },
  {
    "IDs": "663780",
    "lat": "50.017290600000003",
    "lng": "8.7869609000000004",
    "titel": "Teamleitung (w-m-d)",
    "jobs": [1137],
    "weight": 1
  },
  {
    "IDs": "663783",
    "lat": "50.922422599999997",
    "lng": "6.3639118999999997",
    "titel": "",
    "jobs": [1140],
    "weight": 1
  },
  {
    "IDs": "663784,663785",
    "lat": "48.829351899999999",
    "lng": "9.3185739000000005",
    "titel": "\n",
    "jobs": [1141, 1142],
    "weight": 2
  },
  {
    "IDs": "663787,663788",
    "lat": "50.323033700000003",
    "lng": "10.202810700000001",
    "titel": "Entwicklungsingenieur (m/w/d) Claim- und Testmanagement\nEntwicklungsingenieur (m/w/d) Claim- und Testmanagement",
    "jobs": [1144, 1145],
    "weight": 2
  },
  {
    "IDs": "663798",
    "lat": "52.7621246",
    "lng": "13.0286244",
    "titel": "Referent der Direktorin (m/w/d)",
    "jobs": [1155],
    "weight": 1
  },
  {
    "IDs": "663800,663801,663611,663612,648942",
    "lat": "48.7822101",
    "lng": "9.1708309999999997",
    "titel": "Akademischer Mitarbeiter (w/m/d)\nAkademischer Mitarbeiter (w/m/d)\n\n\nSoftware-Architekt/-Entwickler C#.Net (m/w/d)",
    "jobs": [1157, 1158, 1245, 1246, 2618],
    "weight": 5
  },
  {
    "IDs": "663803,663804",
    "lat": "47.9990077",
    "lng": "7.8421042999999999",
    "titel": "\n",
    "jobs": [1160, 1161],
    "weight": 2
  },
  {
    "IDs": "663806,663272",
    "lat": "50.105074600000002",
    "lng": "8.7673831",
    "titel": "SAP MM Support (Junior) Berater (m/w/x)\nProduktmanager Einrichtung (m/w/d)",
    "jobs": [1163, 1500],
    "weight": 2
  },
  {
    "IDs": "663809,663810",
    "lat": "50.302762800000004",
    "lng": "8.5678657999999999",
    "titel": "Risikomanager (m/w/d) Medizinprodukte\nRisikomanager (m/w/d) Medizinprodukte",
    "jobs": [1165, 1166],
    "weight": 2
  },
  {
    "IDs": "663816",
    "lat": "47.756120000000003",
    "lng": "11.369802099999999",
    "titel": "Assistenz (m/w/d)",
    "jobs": [1170],
    "weight": 1
  },
  {
    "IDs": "663819,662219,662220",
    "lat": "48.144058700000002",
    "lng": "11.729598899999999",
    "titel": "Software Engineer (m/w/d) Medizintechnik\nEntwicklungsingenieur/Techniker (m/w/d) Regelungstechnik\nEntwicklungsingenieur/Techniker (m/w/d) Regelungstechnik",
    "jobs": [1172, 1966, 1967],
    "weight": 3
  },
  {
    "IDs": "663824,663107",
    "lat": "51.455643199999997",
    "lng": "7.0115552000000001",
    "titel": "\nIT Product Manager - Billing Services (*)",
    "jobs": [1175, 1575],
    "weight": 2
  },
  {
    "IDs": "663631,663632,663640,663641,663642,663647,660447,660448,659879,659735",
    "lat": "48.1288628",
    "lng": "11.5089621",
    "titel": "Junior Java-Entwickler (m/w/d)\nJunior Java-Entwickler (m/w/d)\nJAVA Entwickler (m/w/d)\nSoftware Support Engineer (m/w/d)\nSoftware Support Engineer (m/w/d)\nJava - Softwareentwickler (m/w/d)\nJunior-Softwareentwickler (m/w/x)\nJunior-Softwareentwickler (m/w/x)\nPerformance Marketing Manager (m/w/d)\nProduktmanager Kartenprodukte (m/w/d)",
    "jobs": [1178, 1179, 1186, 1187, 1188, 1192, 2194, 2195, 2298, 2347],
    "weight": 10
  },
  {
    "IDs": "663633,656570,656571",
    "lat": "48.3656729",
    "lng": "10.894266200000001",
    "titel": "\nNachtdienst (m/w/d)\nNachtdienst (m/w/d)",
    "jobs": [1180, 2491, 2492],
    "weight": 3
  },
  {
    "IDs": "663634",
    "lat": "48.465429499999999",
    "lng": "9.9431464999999992",
    "titel": "Softwareentwickler (m/w/d) C++ Leitsysteme",
    "jobs": [1181],
    "weight": 1
  },
  {
    "IDs": "663635,663636",
    "lat": "47.816533700000001",
    "lng": "7.6370240999999996",
    "titel": "\n",
    "jobs": [1182, 1183],
    "weight": 2
  },
  {
    "IDs": "663638,663639",
    "lat": "49.186404799999998",
    "lng": "12.3806949",
    "titel": "\n",
    "jobs": [1184, 1185],
    "weight": 2
  },
  {
    "IDs": "663648",
    "lat": "49.966389499999998",
    "lng": "8.6633157999999995",
    "titel": "SAP Inhouse Berater CO/SD/MM (m/w/d)",
    "jobs": [1193],
    "weight": 1
  },
  {
    "IDs": "663650,663651,663655",
    "lat": "48.446313799999999",
    "lng": "10.9748736",
    "titel": "Junior Produktmanager (m/w) Elektronische Alarmtechnik / Zutrittskontrolle\nJunior Produktmanager (m/w) Elektronische Alarmtechnik / Zutrittskontrolle\nProduktmanager (m/w) Elektronische Alarmtechnik / Video",
    "jobs": [1195, 1196, 1200],
    "weight": 3
  },
  {
    "IDs": "663656",
    "lat": "48.130893399999998",
    "lng": "11.599551",
    "titel": "Mitarbeiter (m/w/div) Treasury",
    "jobs": [1201],
    "weight": 1
  },
  {
    "IDs": "663696,660417",
    "lat": "50.629243500000001",
    "lng": "12.0391162",
    "titel": "SAP-Anwendungsentwickler (m/w/d) mit Schwerpunkt HCM\nBau-/Planungsingenieur Elektrotechnik TGA (m/w/d)",
    "jobs": [1204, 2184],
    "weight": 2
  },
  {
    "IDs": "663697",
    "lat": "48.846380099999998",
    "lng": "9.1072088999999998",
    "titel": "Meister/Techniker (w/m/d) Einspeise- und Bezugsanlagen im Bereich Mittelspannung",
    "jobs": [1205],
    "weight": 1
  },
  {
    "IDs": "663698,663699,663469,663470,658489,631540",
    "lat": "48.0689177",
    "lng": "11.621253299999999",
    "titel": "Schulbegleiter (m/w/d)\nSchulbegleiter (m/w/d)\nSEO Texter / Redakteur (m/w/d)\nSEO Texter / Redakteur (m/w/d)\nSAP ABAP Entwickler (m/w/x)\nErzieher (m/w/d)",
    "jobs": [1206, 1207, 1320, 1321, 2417, 2661],
    "weight": 6
  },
  {
    "IDs": "663701",
    "lat": "50.903769199999999",
    "lng": "6.9682250000000003",
    "titel": "Beteiligungsmanager (m/w/d)",
    "jobs": [1209],
    "weight": 1
  },
  {
    "IDs": "663708,663434,663345",
    "lat": "52.734933499999997",
    "lng": "8.2880496000000008",
    "titel": "\n\nKalkulator / Kalkulatorin (m/w/d)",
    "jobs": [1216, 1417, 1465],
    "weight": 3
  },
  {
    "IDs": "663713,663714,663275",
    "lat": "50.083029199999999",
    "lng": "8.2387330999999993",
    "titel": "\n\n",
    "jobs": [1217, 1218, 1502],
    "weight": 3
  },
  {
    "IDs": "663717,663718",
    "lat": "47.717187099999997",
    "lng": "9.0663456",
    "titel": "Controller (m/w/d)\nController (m/w/d)",
    "jobs": [1221, 1222],
    "weight": 2
  },
  {
    "IDs": "663719,663330",
    "lat": "47.874763999999999",
    "lng": "7.7316988999999996",
    "titel": "Bauleiter (m/w/d)\nTraineeprogramm Vertrieb/Kredit",
    "jobs": [1223, 1454],
    "weight": 2
  },
  {
    "IDs": "663726,662951,662462,660479,660480,658650,658219",
    "lat": "51.2562128",
    "lng": "7.1507636000000003",
    "titel": "Projektmanager (w/m/d) IT-Projekte\nSAP Fiori Developer (m/w/d)\nDatenbankadministrator MS SQL Server (m/w/d)\nRisikomanager (m/w/d) Modellvalidierung\nRisikomanager (m/w/d) Modellvalidierung\nSAP PP Berater (m/w/x)\nSAP Co Berater (m/w/x)",
    "jobs": [1229, 1639, 1914, 2141, 2142, 2410, 2418],
    "weight": 7
  },
  {
    "IDs": "663728,663729",
    "lat": "50.741202100000002",
    "lng": "8.2065505000000005",
    "titel": "Inhouse Consultant (m/w/d) SAP Logistik\nInhouse Consultant (m/w/d) SAP Logistik",
    "jobs": [1230, 1231],
    "weight": 2
  },
  {
    "IDs": "663733,663734",
    "lat": "53.919582200000001",
    "lng": "9.8821729999999999",
    "titel": "\n",
    "jobs": [1235, 1236],
    "weight": 2
  },
  {
    "IDs": "663738,663327,657572",
    "lat": "51.219103799999999",
    "lng": "7.6312600000000002",
    "titel": "\nIT-Administrator (m/w/d)\nSAP Senior SD Berater (m/w/x)",
    "jobs": [1240, 1451, 2463],
    "weight": 3
  },
  {
    "IDs": "663743",
    "lat": "49.284149399999997",
    "lng": "9.6909296000000005",
    "titel": "",
    "jobs": [1244],
    "weight": 1
  },
  {
    "IDs": "663846,663847",
    "lat": "51.947516100000001",
    "lng": "7.6603488000000004",
    "titel": "\n",
    "jobs": [1247, 1248],
    "weight": 2
  },
  {
    "IDs": "663615,663473,660092",
    "lat": "49.240157199999999",
    "lng": "6.9969327000000003",
    "titel": "Business Intelligence- / Data Warehouse-Entwickler (w/m/d)\n\nBusiness Analyst (m/w/d)",
    "jobs": [1251, 1324, 2248],
    "weight": 3
  },
  {
    "IDs": "663540",
    "lat": "48.719202500000002",
    "lng": "9.5110211000000007",
    "titel": "Start Up (Trainee) Engineering - Facility (m/w/d)",
    "jobs": [1255],
    "weight": 1
  },
  {
    "IDs": "663542",
    "lat": "53.526710600000001",
    "lng": "10.0437551",
    "titel": "Manager Change &amp; Culture (m/w/d)",
    "jobs": [1257],
    "weight": 1
  },
  {
    "IDs": "663548,663487,663488,663508,662871,661905,661814,661721,661722,660410,660290,660291,659628",
    "lat": "53.470839300000002",
    "lng": "7.4848308000000001",
    "titel": "(Senior) IT System Engineer (m/w/d) Linux\nElektrotechniker / Elektroingenieur (m/w/d) im Bereich elektrische Maschinen\nElektrotechniker / Elektroingenieur (m/w/d) im Bereich elektrische Maschinen\n\nProzess- und Projektmanager (m/w/d) im Bereich Supply Chain Management\nEntwicklungsingenieur (m/w/d) Anlagenleistung\nController (m/w/d)\nElektroingenieur / Elektrotechniker (m/w/d) Netzintegration\nElektroingenieur / Elektrotechniker (m/w/d) Netzintegration\nSAP Inhouse Consultant (m/w/d) Sales\nKalkulator/Kalkulatorin (m/w/d)\nKalkulator/Kalkulatorin (m/w/d)\nMitarbeiter (m/w/d) Technical Engineering and Support",
    "jobs": [1259, 1337, 1338, 1354, 1709, 2072, 2096, 2110, 2111, 2183, 2211, 2212, 2323],
    "weight": 13
  },
  {
    "IDs": "663555",
    "lat": "51.449008200000002",
    "lng": "6.8548989000000002",
    "titel": "Procurement Assistant - Indirekter Einkauf (m/w/x)",
    "jobs": [1266],
    "weight": 1
  },
  {
    "IDs": "663568",
    "lat": "47.750650999999998",
    "lng": "11.7370649",
    "titel": "Trade and Visual Marketing Manager (w/m/d) international",
    "jobs": [1270],
    "weight": 1
  },
  {
    "IDs": "663574",
    "lat": "49.467756199999997",
    "lng": "8.5066360000000003",
    "titel": "",
    "jobs": [1276],
    "weight": 1
  },
  {
    "IDs": "663575,663125,663126",
    "lat": "48.7384056",
    "lng": "9.3081095000000005",
    "titel": "\nIngenieur (w/m/d) Elektrotechnik\nIngenieur (w/m/d) Elektrotechnik",
    "jobs": [1277, 1587, 1588],
    "weight": 3
  },
  {
    "IDs": "663579,658094,658095",
    "lat": "48.947160500000003",
    "lng": "9.1305037000000002",
    "titel": "Contract Manager (m/w/d)\nMitarbeiter (m/w/d)  IT Identity Management (IDM)\nMitarbeiter (m/w/d)  IT Identity Management (IDM)",
    "jobs": [1281, 2423, 2424],
    "weight": 3
  },
  {
    "IDs": "663587,663210,662830,660107",
    "lat": "48.239882399999999",
    "lng": "11.630583",
    "titel": "Wissenschaftliche*r Mitarbeiter*in Maschinelle Lernverfahren\nIngenieur (m/w/d) Hochspannungselektronik\nInformatiker / Elektroingenieure (w/m/d) mit Schwerpunkt Entwicklung Datenerfassungssysteme HW / SW\nSAP ABAP Entwickler (m/w/x)",
    "jobs": [1286, 1533, 1779, 2252],
    "weight": 4
  },
  {
    "IDs": "663588,663589",
    "lat": "52.471345399999997",
    "lng": "13.449973399999999",
    "titel": "Disponent / Kundenbetreuer / Quereinsteiger Vertrieb und Personal (m/w/d)\nDisponent / Kundenbetreuer / Quereinsteiger Vertrieb und Personal (m/w/d)",
    "jobs": [1287, 1288],
    "weight": 2
  },
  {
    "IDs": "663590,662803",
    "lat": "52.390568899999998",
    "lng": "13.0644729",
    "titel": "Systemadministration MS Active Directory\nBauingenieur / Architekt Akquisition / Kalkulation (w/m/d)",
    "jobs": [1289, 1767],
    "weight": 2
  },
  {
    "IDs": "663592,663039",
    "lat": "48.390832000000003",
    "lng": "8.9736431000000003",
    "titel": "\nProduct Owner Omnichannel (m/w)",
    "jobs": [1290, 1600],
    "weight": 2
  },
  { "IDs": "663593", "lat": "48.5718453", "lng": "13.460729600000001", "titel": "", "jobs": [1291], "weight": 1 },
  {
    "IDs": "663601,663602",
    "lat": "51.847303699999998",
    "lng": "11.5346329",
    "titel": "Ingenieur/in (m/w/divers) Verfahrenstechnik/Chemie/Siedlungswasserwirtschaft\nIngenieur/in (m/w/divers) Verfahrenstechnik/Chemie/Siedlungswasserwirtschaft",
    "jobs": [1297, 1298],
    "weight": 2
  },
  {
    "IDs": "663604,663605",
    "lat": "48.216512700000003",
    "lng": "11.257240100000001",
    "titel": "Softwareentwickler (m/w/d)\nSoftwareentwickler (m/w/d)",
    "jobs": [1300, 1301],
    "weight": 2
  },
  {
    "IDs": "663436",
    "lat": "49.749991999999999",
    "lng": "6.6371433",
    "titel": "Sozialarbeiter*in (m/w/d) Reha-Beratung",
    "jobs": [1302],
    "weight": 1
  },
  {
    "IDs": "663437,662586,662587",
    "lat": "48.777263499999997",
    "lng": "9.1875122999999999",
    "titel": "HR Manager (m/w/d) strategisches Personalmanagement\nKundenberater (m/w/d) in der betrieblichen Altersversorgung (Firmenkunden)\nKundenberater (m/w/d) in der betrieblichen Altersversorgung (Firmenkunden)",
    "jobs": [1303, 1873, 1874],
    "weight": 3
  },
  {
    "IDs": "663438,663439",
    "lat": "49.4141464",
    "lng": "7.5709052000000003",
    "titel": "Sozialarbeiter*in (m/w/d) Reha-Beratung\nSozialarbeiter*in (m/w/d) Reha-Beratung",
    "jobs": [1304, 1305],
    "weight": 2
  },
  {
    "IDs": "663462,663463",
    "lat": "48.0574504",
    "lng": "11.519143",
    "titel": "IT-(Junior) Netzwerkadministrator (m/w/d)\nIT-(Junior) Netzwerkadministrator (m/w/d)",
    "jobs": [1313, 1314],
    "weight": 2
  },
  {
    "IDs": "663465",
    "lat": "48.847863400000001",
    "lng": "10.082194400000001",
    "titel": "Wissenschaftlicher Mitarbeiter in der Wissenschaftskommunikation (m/w/d)",
    "jobs": [1316],
    "weight": 1
  },
  {
    "IDs": "663468",
    "lat": "48.411445899999997",
    "lng": "9.4980357000000009",
    "titel": "",
    "jobs": [1319],
    "weight": 1
  },
  {
    "IDs": "663471,663472,659906",
    "lat": "48.144098900000003",
    "lng": "11.5695525",
    "titel": "\n\nSystemarchitekt (m/w/d)",
    "jobs": [1322, 1323, 2306],
    "weight": 3
  },
  {
    "IDs": "663474,663475,662826,662382",
    "lat": "50.827845000000003",
    "lng": "12.9213697",
    "titel": "Entwicklungsingenieur &quot;Cloud- und Anwendungsentwicklung&quot; (m/w/d)\nEntwicklungsingenieur &quot;Cloud- und Anwendungsentwicklung&quot; (m/w/d)\nKalkulator GU (m/w/d)\n",
    "jobs": [1325, 1326, 1777, 1932],
    "weight": 4
  },
  {
    "IDs": "663476,662386",
    "lat": "50.111325299999997",
    "lng": "8.7174303999999996",
    "titel": "\nLead API Developer (w/m/d)",
    "jobs": [1327, 1934],
    "weight": 2
  },
  {
    "IDs": "663478,663479",
    "lat": "49.510737200000001",
    "lng": "10.3279599",
    "titel": "\n",
    "jobs": [1328, 1329],
    "weight": 2
  },
  {
    "IDs": "663482,663483",
    "lat": "50.417598499999997",
    "lng": "12.175807300000001",
    "titel": "IT-Administrator (m/w/d)\nIT-Administrator (m/w/d)",
    "jobs": [1332, 1333],
    "weight": 2
  },
  {
    "IDs": "663484",
    "lat": "48.800797099999997",
    "lng": "9.2257415999999992",
    "titel": "",
    "jobs": [1334],
    "weight": 1
  },
  {
    "IDs": "663493,663425,663065,663003,663004,662253,663127,661850,661851,661729,660005,659829,659830,659903,654925",
    "lat": "50.110089700000003",
    "lng": "8.6822491999999993",
    "titel": "\n\nIT-Anwendungsbetreuerin / IT-Anwendungsbetreuer Krankenhausinformationssysteme\n\n\n\nSchadensachbearbeiter / Claims Manager (m/w/d) Immobilienversicherung\nSoftwareentwickler (m/w/d) Frontend / Backend / Fullstack\nSoftwareentwickler (m/w/d) Frontend / Backend / Fullstack\n\nTechnical Consultant ServiceNow (m/w/d)\nIT-Requirements Engineer / Business Analyst (m/w/d)\nIT-Requirements Engineer / Business Analyst (m/w/d)\n\nSAP ABAP / UI5 Entwickler (m/w/x)",
    "jobs": [1339, 1409, 1619, 1683, 1684, 1985, 2014, 2051, 2052, 2112, 2268, 2283, 2284, 2305, 2510],
    "weight": 15
  },
  {
    "IDs": "663497,663498",
    "lat": "48.180092299999998",
    "lng": "11.5497532",
    "titel": "\n",
    "jobs": [1343, 1344],
    "weight": 2
  },
  {
    "IDs": "663501",
    "lat": "48.789397700000002",
    "lng": "9.1962770999999996",
    "titel": "",
    "jobs": [1347],
    "weight": 1
  },
  {
    "IDs": "663507",
    "lat": "49.006749800000001",
    "lng": "8.3938430000000004",
    "titel": "IT Consultant Web + Mobile (w/m/d)",
    "jobs": [1353],
    "weight": 1
  },
  {
    "IDs": "663513",
    "lat": "49.358964999999998",
    "lng": "8.1361816999999999",
    "titel": "Anwendungsentwickler (m/w/d) Android / iOS / Desktop",
    "jobs": [1357],
    "weight": 1
  },
  {
    "IDs": "663517,659523",
    "lat": "50.984767900000001",
    "lng": "11.02988",
    "titel": "\n",
    "jobs": [1359, 2361],
    "weight": 2
  },
  {
    "IDs": "663522,663523,660166",
    "lat": "48.813033099999998",
    "lng": "9.1044081000000006",
    "titel": "Data Analyst / Business Analyst (m/w/d) im Vertriebscontrolling\nData Analyst / Business Analyst (m/w/d) im Vertriebscontrolling\nProjektleitung Elektro- / Nachrichtentechnik (m/w/d)",
    "jobs": [1362, 1363, 2232],
    "weight": 3
  },
  {
    "IDs": "663524,663525",
    "lat": "48.484456100000003",
    "lng": "9.8946463999999992",
    "titel": "Softwareentwickler (m/w/d) C++ Automatisierungstechnik\nSoftwareentwickler (m/w/d) C++ Automatisierungstechnik",
    "jobs": [1364, 1365],
    "weight": 2
  },
  {
    "IDs": "663529",
    "lat": "53.581417000000002",
    "lng": "9.9130649000000002",
    "titel": "Junior SEA-Manager (m/w/d)",
    "jobs": [1369],
    "weight": 1
  },
  {
    "IDs": "663358,663359,663360,663361,663362,663363,662284,662285,659281,659262,659263,658843",
    "lat": "51.481844500000001",
    "lng": "7.2162363000000003",
    "titel": "Softwareentwickler Produktentwicklung (m/w/d) - Schwerpunkt .NET und .NET Core\nSoftwareentwickler Produktentwicklung (m/w/d) - Schwerpunkt .NET und .NET Core\nSoftwareentwickler (m/w/d) - Schwerpunkt Cloud-Technologien\nJunior-IT-Consultant / Projektleiter (m/w/d)\nJunior-IT-Consultant / Projektleiter (m/w/d)\nSoftwareentwickler in der Produktentwicklung (m/w/d) - Schwerpunkt Web-Technologien\nSoftwareentwickler(in) (Java)\nIT-Systemadministrator(in)\nMedizininformatiker (m/w/d) als Referentinnen/Referenten Telemedizin\nController (m/w/d) Schwerpunkt Projektcontrolling\nController (m/w/d) Schwerpunkt Projektcontrolling\nSAP HCM Berater (m/w/x)",
    "jobs": [1370, 1371, 1372, 1373, 1374, 1375, 1941, 1942, 2366, 2376, 2377, 2397],
    "weight": 12
  },
  {
    "IDs": "663378",
    "lat": "51.239538699999997",
    "lng": "6.4169437",
    "titel": "Content Marketing Manager (m/w/d)",
    "jobs": [1377],
    "weight": 1
  },
  {
    "IDs": "663393",
    "lat": "48.964221000000002",
    "lng": "8.6231224999999991",
    "titel": "Maschinenbautechniker (m/w/d) mit Schwerpunkt Konstruktion von Vorrichtungen / Werkzeugen",
    "jobs": [1383],
    "weight": 1
  },
  {
    "IDs": "663394",
    "lat": "48.556954500000003",
    "lng": "11.4956969",
    "titel": "Vertriebsingenieur/ Account Manager (m/w/d)",
    "jobs": [1384],
    "weight": 1
  },
  {
    "IDs": "663395",
    "lat": "47.6553112",
    "lng": "8.4250070000000008",
    "titel": "Produktmanager (m/w/d) Abdichtung",
    "jobs": [1385],
    "weight": 1
  },
  {
    "IDs": "663397",
    "lat": "52.275879099999997",
    "lng": "8.0560591000000006",
    "titel": "Personalberater / -disponent (m/w/d) im Gesundheitswesen",
    "jobs": [1387],
    "weight": 1
  },
  {
    "IDs": "663401,662810",
    "lat": "51.358643499999999",
    "lng": "7.4689806000000001",
    "titel": "Trainee (m/w/d) im Projektmanagement - Bereich Engineering - pharmazeutische Industrie\nWeb-Administratorinnen / Web-Administratoren (m/w/d)",
    "jobs": [1389, 1769],
    "weight": 2
  },
  {
    "IDs": "663409",
    "lat": "53.5688101",
    "lng": "9.9819779000000004",
    "titel": "Systemadministration (m/w/d) SAN und Storage",
    "jobs": [1395],
    "weight": 1
  },
  {
    "IDs": "663413,663184,662221,661866,660310,658952,658413",
    "lat": "49.487459200000004",
    "lng": "8.4660395000000008",
    "titel": "Web Entwickler / Web Developer (m/w/d)\nReferent Konzernrechnungslegung und Working Capital Management (m/w/d)\nSAP MM Berater (m/w/x)\nSAP IS-Retail / Stammdaten Berater (m/w/x)\nSAP Berater Berechtigungen (m/w/x)\nSAP ABAP Entwickler / Architekt (m/w/x)\nSAP Fiori / UI5 Entwickler (m/w/x)",
    "jobs": [1399, 1516, 1968, 2055, 2220, 2392, 2413],
    "weight": 7
  },
  {
    "IDs": "663415",
    "lat": "51.637739000000003",
    "lng": "7.2579564000000003",
    "titel": "",
    "jobs": [1401],
    "weight": 1
  },
  {
    "IDs": "663417,663418,663420",
    "lat": "51.905953099999998",
    "lng": "10.4289963",
    "titel": "Projektingenieur (m/w/d) Verfahrenstechnik im Anlagen- und Apparatebau\nProjektingenieur (m/w/d) Verfahrenstechnik im Anlagen- und Apparatebau\n3-D Konstrukteur (m/w/d) Apparate-/Anlagenbau, Schwerpunkt Verfahrenstechnik",
    "jobs": [1402, 1403, 1405],
    "weight": 3
  },
  {
    "IDs": "663421",
    "lat": "49.187862000000003",
    "lng": "11.014143300000001",
    "titel": "Mitarbeiter im Technischen Innendienst (m/w/d)",
    "jobs": [1406],
    "weight": 1
  },
  {
    "IDs": "663430",
    "lat": "47.763097700000003",
    "lng": "11.3829463",
    "titel": "Mitarbeiter Inventarisierung Methodenvalidierung (m/w/d)",
    "jobs": [1413],
    "weight": 1
  },
  {
    "IDs": "663431",
    "lat": "50.979571499999999",
    "lng": "10.3146872",
    "titel": "Disponent / Kundenbetreuer / Quereinsteiger (m/w/d) Vertrieb und Personal",
    "jobs": [1414],
    "weight": 1
  },
  {
    "IDs": "663284,663285,663286,663170,662328,662329",
    "lat": "52.035980000000002",
    "lng": "8.3172113999999997",
    "titel": "SAP Inhouse Logistik Berater SD/LO (w/m/d)\nInhouse SAP MM/PP Consultant (w/m/d)\nInhouse SAP MM/PP Consultant (w/m/d)\nProjektingenieur (m/w/d) Versorgungstechnik\n(Junior) Internationaler Buchhalter / Accountant (m/w/d)\n(Junior) Internationaler Buchhalter / Accountant (m/w/d)",
    "jobs": [1420, 1421, 1422, 1510, 1959, 1960],
    "weight": 6
  },
  {
    "IDs": "663292",
    "lat": "48.996662899999997",
    "lng": "9.1575486000000001",
    "titel": "Digital Marketing Specialist (m/w/d) Hand Tools EMEA",
    "jobs": [1423],
    "weight": 1
  },
  {
    "IDs": "663298",
    "lat": "48.663555000000002",
    "lng": "9.1215291000000001",
    "titel": "Mitarbeiter Marketing (m/w/d)",
    "jobs": [1425],
    "weight": 1
  },
  {
    "IDs": "663301",
    "lat": "51.370492900000002",
    "lng": "6.4273577",
    "titel": "Referent (m/w/d) Personal",
    "jobs": [1427],
    "weight": 1
  },
  {
    "IDs": "663303",
    "lat": "49.3753539",
    "lng": "11.2129142",
    "titel": "Mitarbeiter (m/w/d) im Software Test Team - Mobiles Arbeiten",
    "jobs": [1429],
    "weight": 1
  },
  {
    "IDs": "663304,663305,662977,661645",
    "lat": "51.487257700000001",
    "lng": "11.9600411",
    "titel": "Product-Owner (m/w/d)\nProduct-Owner (m/w/d)\n\nJunior DevOps Engineer / Junior Cloud Operation Engineer (m/f/o)",
    "jobs": [1430, 1431, 1659, 2139],
    "weight": 4
  },
  {
    "IDs": "663310",
    "lat": "50.550272700000001",
    "lng": "7.4174576999999999",
    "titel": "Informationssicherheitsbeauftragter - ISB (m/w/d)",
    "jobs": [1436],
    "weight": 1
  },
  {
    "IDs": "663328,659427",
    "lat": "47.677949599999998",
    "lng": "9.1732384000000007",
    "titel": "Process Specialist GMP - Steril (m/w/d)\nPersonalreferent (m/w/d)",
    "jobs": [1452, 2365],
    "weight": 2
  },
  {
    "IDs": "663337",
    "lat": "47.922699799999997",
    "lng": "9.7532823000000004",
    "titel": "IT-Generalist (m/w/d)",
    "jobs": [1459],
    "weight": 1
  },
  {
    "IDs": "663338,663339",
    "lat": "48.093090199999999",
    "lng": "11.465776399999999",
    "titel": "Erzieher*in bzw. Kinderpfleger*in (m/w/d)\nErzieher*in bzw. Kinderpfleger*in (m/w/d)",
    "jobs": [1460, 1461],
    "weight": 2
  },
  {
    "IDs": "663340",
    "lat": "48.135961600000002",
    "lng": "11.538205899999999",
    "titel": "Mitarbeiter (m/w/d) im System- / Applikationsmanagement",
    "jobs": [1462],
    "weight": 1
  },
  { "IDs": "663346", "lat": "49.589036299999997", "lng": "11.0118679", "titel": "", "jobs": [1466], "weight": 1 },
  {
    "IDs": "663348",
    "lat": "51.756310800000001",
    "lng": "14.3328679",
    "titel": "Informatiker*in (m/w/d) mit Schwerpunkt Lern- und Medientechnologie",
    "jobs": [1468],
    "weight": 1
  },
  {
    "IDs": "663352",
    "lat": "48.789046399999997",
    "lng": "10.342698499999999",
    "titel": "",
    "jobs": [1472],
    "weight": 1
  },
  {
    "IDs": "663214,663215",
    "lat": "52.071699500000001",
    "lng": "10.8234753",
    "titel": "Projektentwickler Erneuerbare Energien (m/w/d)\nProjektentwickler Erneuerbare Energien (m/w/d)",
    "jobs": [1474, 1475],
    "weight": 2
  },
  {
    "IDs": "663228",
    "lat": "51.389752000000001",
    "lng": "12.052872900000001",
    "titel": "",
    "jobs": [1476],
    "weight": 1
  },
  {
    "IDs": "663229",
    "lat": "51.244078399999999",
    "lng": "7.0671701999999996",
    "titel": "Online-Redakteur (m/w/d)",
    "jobs": [1477],
    "weight": 1
  },
  {
    "IDs": "663235,663236,662084,662085,660095,657573,657574",
    "lat": "48.208174300000003",
    "lng": "16.3738189",
    "titel": "SAP Success Factors Berater (m/w/x)\nSAP Success Factors Berater (m/w/x)\nSAP Junior Berater (m/w/x)\nSAP Junior Berater (m/w/x)\nJunior Full Stack Developer (m/w/d)\nSAP SuccessFactors Berater (m/w/x)\nSAP SuccessFactors Berater (m/w/x)",
    "jobs": [1480, 1481, 2020, 2021, 2249, 2464, 2465],
    "weight": 7
  },
  {
    "IDs": "663263,660407,660408,660426,657689,657690",
    "lat": "48.953568199999999",
    "lng": "9.1241772000000001",
    "titel": "Controller (m/w/d)\nAdministrator (m/w/d) Data Center\nAdministrator (m/w/d) Data Center\nECM-Administrator (m/w/d)\nSAP Basis Administrator (w/m/d)\nSAP Basis Administrator (w/m/d)",
    "jobs": [1494, 2181, 2182, 2185, 2455, 2456],
    "weight": 6
  },
  {
    "IDs": "663265,663266,663032,663053",
    "lat": "53.939052799999999",
    "lng": "10.305365200000001",
    "titel": "\n\nApplication Manager*in (m/w/d)\nSystemadministrator (m/w/d)",
    "jobs": [1495, 1496, 1595, 1610],
    "weight": 4
  },
  {
    "IDs": "663268,662798,662799,662834,662835",
    "lat": "48.869794599999999",
    "lng": "9.4066135000000006",
    "titel": "\nMitarbeiter im Vergabemanagement (m/w/i)\nMitarbeiter im Vergabemanagement (m/w/i)\n\n",
    "jobs": [1497, 1765, 1766, 1782, 1783],
    "weight": 5
  },
  {
    "IDs": "663276,662252",
    "lat": "49.980662500000001",
    "lng": "9.1355553999999994",
    "titel": "Account Manager (all genders) Russia\nSAP PM / CS Key-User Job (m/w/x)",
    "jobs": [1503, 1984],
    "weight": 2
  },
  {
    "IDs": "663279,662861,662862,662867,662868,662882,662883,662775,662776,662850,662234,662235,662236,662237",
    "lat": "51.131392699999999",
    "lng": "7.9049443000000004",
    "titel": "Digitalization Consultant (m/w/d)\n\n\nController (m/w/d)\nController (m/w/d)\nController (m/w/d) Schwerpunkt internationale Prozesse\nController (m/w/d) Schwerpunkt internationale Prozesse\nIT Asset Manager (m/w/d)\nIT Asset Manager (m/w/d)\nEntwicklungsingenieur / Produktentwickler (m/w/d) Piping Systems\nCRM Berater / Sales Supporter (m/w/d)\nCRM Berater / Sales Supporter (m/w/d)\nERP R3/S4 Hana SD-Berater / Sales Supporter (m/w/d)\nERP R3/S4 Hana SD-Berater / Sales Supporter (m/w/d)",
    "jobs": [1505, 1701, 1702, 1707, 1708, 1715, 1716, 1752, 1753, 1792, 1974, 1975, 1976, 1977],
    "weight": 14
  },
  {
    "IDs": "663281",
    "lat": "50.753343800000003",
    "lng": "6.1123900999999998",
    "titel": "Organisationsmanagerin / Organisationsmanager (m/w/d)",
    "jobs": [1507],
    "weight": 1
  },
  {
    "IDs": "663282",
    "lat": "54.317843400000001",
    "lng": "9.6800016000000006",
    "titel": "Entwickler (m/w/d) SAP Commerce",
    "jobs": [1508],
    "weight": 1
  },
  {
    "IDs": "663283",
    "lat": "48.920984699999998",
    "lng": "9.3395770000000002",
    "titel": "Entwicklungsingenieur Softwareentwicklung Getriebe (m/w/d)",
    "jobs": [1509],
    "weight": 1
  },
  {
    "IDs": "663177,663164,662147,660109,660110",
    "lat": "52.374983899999997",
    "lng": "9.7388153000000006",
    "titel": "Bautechniker (m/w/d)\nAdministrator z/OS (m/w/d)\nEDV-Koordinator (m/w/d)\nSystemadministrator DMZ/Firewalls (m/w/d)\nSystemadministrator DMZ/Firewalls (m/w/d)",
    "jobs": [1511, 1564, 1997, 2253, 2254],
    "weight": 5
  },
  {
    "IDs": "663180",
    "lat": "50.070976000000002",
    "lng": "8.9404064999999999",
    "titel": "",
    "jobs": [1514],
    "weight": 1
  },
  {
    "IDs": "663191",
    "lat": "50.819381399999997",
    "lng": "6.1462316000000001",
    "titel": "",
    "jobs": [1517],
    "weight": 1
  },
  {
    "IDs": "663193",
    "lat": "51.903237500000003",
    "lng": "8.3857534999999999",
    "titel": "Service Delivery Manager (w/m/d) IT-Infrastruktur",
    "jobs": [1519],
    "weight": 1
  },
  {
    "IDs": "663137",
    "lat": "51.977755000000002",
    "lng": "8.4602772000000002",
    "titel": "Data Architect / Data Engineer (m/w/d)",
    "jobs": [1537],
    "weight": 1
  },
  {
    "IDs": "663138,663139,663140,663144,663145,663147,663148",
    "lat": "49.780136200000001",
    "lng": "9.9647348000000004",
    "titel": "Entwickler/innen (m/w/d)\nEntwickler/innen (m/w/d)\nProzessspezialist/in (m/w/d) - Kennung &quot;HoPro-PRZ&quot;\nProjektkoordinator/in (m/w/d)\n\n(Junior) Java Developer (m/w/d) in der Produktentwicklung\n(Junior) Java Developer (m/w/d) in der Produktentwicklung",
    "jobs": [1538, 1539, 1540, 1544, 1545, 1547, 1548],
    "weight": 7
  },
  {
    "IDs": "663146",
    "lat": "48.286673800000003",
    "lng": "10.0822918",
    "titel": "Produktionscontroller (m/w/d)",
    "jobs": [1546],
    "weight": 1
  },
  {
    "IDs": "663149",
    "lat": "49.2774456",
    "lng": "7.1118994999999998",
    "titel": "Java Developer / Software Entwickler (m/w/d)",
    "jobs": [1549],
    "weight": 1
  },
  {
    "IDs": "663153",
    "lat": "54.468945699999999",
    "lng": "9.8384465999999993",
    "titel": "IT-Systemadministrator (m/w/d)",
    "jobs": [1553],
    "weight": 1
  },
  {
    "IDs": "663154,663155",
    "lat": "50.660397199999998",
    "lng": "12.355937000000001",
    "titel": "Mitarbeiter Systembetreuung betriebliche IT-Systeme (m/w/d)\nMitarbeiter Systembetreuung betriebliche IT-Systeme (m/w/d)",
    "jobs": [1554, 1555],
    "weight": 2
  },
  {
    "IDs": "663157",
    "lat": "50.689460500000003",
    "lng": "7.1674538999999999",
    "titel": "Sachbearbeiter*in (w/m/div) im Referat KM 32 IT-Sicherheits- und IT-Servicemanagement",
    "jobs": [1557],
    "weight": 1
  },
  {
    "IDs": "663158,663159",
    "lat": "49.602405699999998",
    "lng": "11.0069277",
    "titel": "\n",
    "jobs": [1558, 1559],
    "weight": 2
  },
  {
    "IDs": "663161,663162,662711",
    "lat": "51.000866700000003",
    "lng": "13.651241300000001",
    "titel": "Sachbearbeiter*in (w/m/div) im Referat KM 12 - Zulassung von VS-Produkten\nSachbearbeiter*in (w/m/div) im Referat KM 12 - Zulassung von VS-Produkten\nReferent*in (w/m/div) - Nationales Verbindungswesen",
    "jobs": [1561, 1562, 1843],
    "weight": 3
  },
  {
    "IDs": "663163",
    "lat": "49.354374499999999",
    "lng": "6.8057284999999998",
    "titel": "Trainee (m/w/d) Forschung und Entwicklung",
    "jobs": [1563],
    "weight": 1
  },
  {
    "IDs": "663099",
    "lat": "51.616576700000003",
    "lng": "8.8951165999999997",
    "titel": "Projektmanager (m/w/d) im Bereich Abwasserbehandlung",
    "jobs": [1569],
    "weight": 1
  },
  {
    "IDs": "663101,661595,661596,660298,660299",
    "lat": "50.341294499999997",
    "lng": "10.778534199999999",
    "titel": "Data Analyst (m/w/d)\nApplication Expert (m/w/d) Customer Experience - Web\nApplication Expert (m/w/d) Customer Experience - Web\nApplication Expert (m/w/d) SAP Material Management\nApplication Expert (m/w/d) SAP Material Management",
    "jobs": [1570, 2124, 2125, 2216, 2217],
    "weight": 5
  },
  {
    "IDs": "663102,663103",
    "lat": "47.996014899999999",
    "lng": "11.1744717",
    "titel": "\n",
    "jobs": [1571, 1572],
    "weight": 2
  },
  {
    "IDs": "663105",
    "lat": "48.521636399999998",
    "lng": "9.0576448000000003",
    "titel": "IT-Sicherheitsspezialistin / IT-Sicherheitsspezialist (w/m/d)",
    "jobs": [1573],
    "weight": 1
  },
  { "IDs": "663106", "lat": "52.4780704", "lng": "9.8016974000000001", "titel": "", "jobs": [1574], "weight": 1 },
  {
    "IDs": "663108",
    "lat": "52.9658199",
    "lng": "10.5580304",
    "titel": "Pre-Sales-/ Produktmanager (m/w/d)",
    "jobs": [1576],
    "weight": 1
  },
  {
    "IDs": "663110,662228",
    "lat": "48.539248100000002",
    "lng": "9.0615313000000004",
    "titel": "Produktionsplaner (w/m/d) SCM Demand and Capacity Management\nTechniker (w/m/d) Mess-, Steuer- und Regelungstechnik",
    "jobs": [1577, 1969],
    "weight": 2
  },
  {
    "IDs": "663112",
    "lat": "48.865108800000002",
    "lng": "9.1857956999999999",
    "titel": "Software Engineer (m/f/d) for Infrastructure / Continuous Integration",
    "jobs": [1578],
    "weight": 1
  },
  {
    "IDs": "663114",
    "lat": "50.402819200000003",
    "lng": "7.6387397999999997",
    "titel": "Project Manager (f/m/d)",
    "jobs": [1580],
    "weight": 1
  },
  {
    "IDs": "663120",
    "lat": "50.115707800000003",
    "lng": "8.6591468999999996",
    "titel": "Java-Softwareentwickler Integration (m/w/d)",
    "jobs": [1584],
    "weight": 1
  },
  {
    "IDs": "663022,663023,663025,663026,663041,663042,662021",
    "lat": "50.024188899999999",
    "lng": "8.1727506999999999",
    "titel": "(Junior) Solution Architect SAP FI/CO (m/w/d)\n(Junior) Solution Architect SAP FI/CO (m/w/d)\n(Junior) Solution Architect SAP QM (m/w/d)\n(Junior) Solution Architect SAP QM (m/w/d)\n(Junior) Salesforce Architect (m/w/d)\n(Junior) Salesforce Architect (m/w/d)\nCloud Platform Specialist (m/w/d)",
    "jobs": [1590, 1591, 1593, 1594, 1602, 1603, 2034],
    "weight": 7
  },
  {
    "IDs": "663035",
    "lat": "52.168189300000002",
    "lng": "7.5310579999999998",
    "titel": "Referent Konsolidierung und Group Reporting (m/w/d)",
    "jobs": [1596],
    "weight": 1
  },
  {
    "IDs": "663037,663038",
    "lat": "48.2258973",
    "lng": "11.6742738",
    "titel": "\n",
    "jobs": [1598, 1599],
    "weight": 2
  },
  {
    "IDs": "663043",
    "lat": "51.542634900000003",
    "lng": "7.6853113999999998",
    "titel": "Java Entwickler/-in",
    "jobs": [1604],
    "weight": 1
  },
  {
    "IDs": "663052",
    "lat": "53.961306499999999",
    "lng": "10.1528455",
    "titel": "Projektmanager*in (m/w/d)",
    "jobs": [1609],
    "weight": 1
  },
  {
    "IDs": "663058,661685,661637",
    "lat": "48.676259299999998",
    "lng": "8.9773145000000003",
    "titel": "HW-Entwickler (m/w/d)\nR&amp;D Engineer RF Software (m/f/d)\nComponent Quality Engineer (m/f/d)",
    "jobs": [1612, 2101, 2138],
    "weight": 3
  },
  {
    "IDs": "663060,663061",
    "lat": "51.673858299999999",
    "lng": "7.8159817",
    "titel": "Management-Assistent (m/w/d) Personal / Controlling / Rechnungswesen\nManagement-Assistent (m/w/d) Personal / Controlling / Rechnungswesen",
    "jobs": [1614, 1615],
    "weight": 2
  },
  { "IDs": "663062", "lat": "49.540214900000002", "lng": "11.2752883", "titel": "", "jobs": [1616], "weight": 1 },
  {
    "IDs": "663066",
    "lat": "48.3538888",
    "lng": "8.9613627000000005",
    "titel": "Teamleiter (m/w/d) Abteilung Systembau inkl. Halbfertigteilfertigung, Kommissionierlager und Reinigung von Bauteilen",
    "jobs": [1620],
    "weight": 1
  },
  {
    "IDs": "663067,663068",
    "lat": "51.552191800000003",
    "lng": "7.7013157999999997",
    "titel": "\n",
    "jobs": [1621, 1622],
    "weight": 2
  },
  {
    "IDs": "663070,663071,663074,663075",
    "lat": "48.088056000000002",
    "lng": "10.8567673",
    "titel": "Enterprise Architect (m/w/d)\nEnterprise Architect (m/w/d)\nFachinformatiker mit Schwerpunkt ERP (w/d/m)\nFachinformatiker mit Schwerpunkt ERP (w/d/m)",
    "jobs": [1624, 1625, 1628, 1629],
    "weight": 4
  },
  {
    "IDs": "663072,662884",
    "lat": "54.7937431",
    "lng": "9.4469963999999997",
    "titel": "Systementwickler (w/m/d)\nNetzwerk Security Engineer - Schwerpunkt Firewalls (m/w/d)",
    "jobs": [1626, 1717],
    "weight": 2
  },
  {
    "IDs": "662949,662950,662983,662984",
    "lat": "50.699893699999997",
    "lng": "10.9065607",
    "titel": "Wissenschaftliche*r Mitarbeiter*in im Bereich Cyber-sichere Infratstrukturen\nWissenschaftliche*r Mitarbeiter*in im Bereich Cyber-sichere Infratstrukturen\nWissenschaftliche*r Mitarbeiter*in im Bereich Modellierung und Analyse elektrische Energiesysteme\nWissenschaftliche*r Mitarbeiter*in im Bereich Modellierung und Analyse elektrische Energiesysteme",
    "jobs": [1637, 1638, 1665, 1666],
    "weight": 4
  },
  {
    "IDs": "662955,662956",
    "lat": "49.449102000000003",
    "lng": "11.087354299999999",
    "titel": "Technischer Projektleiter (m/w/d)\nTechnischer Projektleiter (m/w/d)",
    "jobs": [1641, 1642],
    "weight": 2
  },
  {
    "IDs": "662964",
    "lat": "48.286161200000002",
    "lng": "8.7231851999999996",
    "titel": "Cost Engineer (m/w/d)",
    "jobs": [1649],
    "weight": 1
  },
  {
    "IDs": "662980,662981",
    "lat": "51.541280399999998",
    "lng": "9.9158035000000009",
    "titel": "Physiker / Ingenieur (m/w/d) im wissenschaftlichen Anlagenbau\nElektroingenieur (m/w/d)",
    "jobs": [1662, 1663],
    "weight": 2
  },
  {
    "IDs": "662987",
    "lat": "49.277260599999998",
    "lng": "11.4671995",
    "titel": "Technische Angestellte (Bauingenieure / Techniker) (m/w/d)",
    "jobs": [1669],
    "weight": 1
  },
  {
    "IDs": "663001,663002",
    "lat": "51.367077700000003",
    "lng": "7.4632841000000001",
    "titel": "Anwendungstechniker (m/w/d)\nAnwendungstechniker (m/w/d)",
    "jobs": [1681, 1682],
    "weight": 2
  },
  { "IDs": "662933", "lat": "51.394469700000002", "lng": "12.2240071", "titel": "", "jobs": [1690], "weight": 1 },
  {
    "IDs": "662936,662937",
    "lat": "52.194141899999998",
    "lng": "8.7220861999999997",
    "titel": "(Junior) Controller (m/w/d)\n(Junior) Controller (m/w/d)",
    "jobs": [1693, 1694],
    "weight": 2
  },
  {
    "IDs": "662938",
    "lat": "52.5231724",
    "lng": "13.365316999999999",
    "titel": "Projektleiter Stadt- und Regionalentwicklung (m/w/d)",
    "jobs": [1695],
    "weight": 1
  },
  {
    "IDs": "662943",
    "lat": "49.662900700000002",
    "lng": "8.0116405000000004",
    "titel": "",
    "jobs": [1698],
    "weight": 1
  },
  {
    "IDs": "662944,662945",
    "lat": "52.506911500000001",
    "lng": "13.365050800000001",
    "titel": "Mitarbeiter w/m/d im IT Vertriebsinnendienst Presales - Schwerpunkt Cisco Networking oder Workplace\nMitarbeiter w/m/d im IT Vertriebsinnendienst Presales - Schwerpunkt Cisco Networking oder Workplace",
    "jobs": [1699, 1700],
    "weight": 2
  },
  {
    "IDs": "662864,661701,660292,660128",
    "lat": "47.910378799999997",
    "lng": "10.2543022",
    "titel": "UX-Designer (m/w/d)\nAnwendungsprogrammierer (m/w/d) Konfiguration\nIT Systemadministrator (m/w/d)\nIT Professional for IT-Compliance, Processes and Controlling (m/w/d)",
    "jobs": [1704, 2106, 2213, 2228],
    "weight": 4
  },
  {
    "IDs": "662873,662874",
    "lat": "47.936621299999999",
    "lng": "12.4496451",
    "titel": "\n",
    "jobs": [1710, 1711],
    "weight": 2
  },
  {
    "IDs": "662875,662876",
    "lat": "50.325230400000002",
    "lng": "11.9360556",
    "titel": "\n",
    "jobs": [1712, 1713],
    "weight": 2
  },
  {
    "IDs": "662892",
    "lat": "47.616919099999997",
    "lng": "7.6709247999999999",
    "titel": "",
    "jobs": [1722],
    "weight": 1
  },
  {
    "IDs": "662897",
    "lat": "48.905018200000001",
    "lng": "8.5002662000000004",
    "titel": "Produktmanager / Produktspezialist (m/w/d)",
    "jobs": [1724],
    "weight": 1
  },
  {
    "IDs": "662898",
    "lat": "48.115667199999997",
    "lng": "11.264018200000001",
    "titel": "Administrator IT und Onsite-Support (m/w/d)",
    "jobs": [1725],
    "weight": 1
  },
  {
    "IDs": "662903,662904",
    "lat": "50.806787499999999",
    "lng": "8.4330960000000008",
    "titel": "\n",
    "jobs": [1728, 1729],
    "weight": 2
  },
  {
    "IDs": "662909,660085",
    "lat": "48.587929099999997",
    "lng": "8.8793279999999992",
    "titel": "Vermessungsingenieur (w/m/d) GIS\nBauingenieur (w/m/d) Tiefbau und Netzbau",
    "jobs": [1732, 2247],
    "weight": 2
  },
  {
    "IDs": "662912,662913",
    "lat": "54.086546300000002",
    "lng": "13.392341399999999",
    "titel": "Disponent / Kundenbetreuer / Quereinsteiger Vertrieb und Personal (m/w/d)\nDisponent / Kundenbetreuer / Quereinsteiger Vertrieb und Personal (m/w/d)",
    "jobs": [1734, 1735],
    "weight": 2
  },
  {
    "IDs": "662746,662747",
    "lat": "48.181107799999999",
    "lng": "11.5115453",
    "titel": "\n",
    "jobs": [1744, 1745],
    "weight": 2
  },
  {
    "IDs": "662767,662768",
    "lat": "48.798878000000002",
    "lng": "9.1865334999999995",
    "titel": "Digital Sales Manager (m/w/d)\nDigital Sales Manager (m/w/d)",
    "jobs": [1746, 1747],
    "weight": 2
  },
  {
    "IDs": "662778,662779",
    "lat": "47.720387700000003",
    "lng": "12.897202099999999",
    "titel": "Schulbegleitung (m/w/d)\nSchulbegleitung (m/w/d)",
    "jobs": [1754, 1755],
    "weight": 2
  },
  {
    "IDs": "662783,662784",
    "lat": "48.642512500000002",
    "lng": "9.4594184000000006",
    "titel": "\n",
    "jobs": [1756, 1757],
    "weight": 2
  },
  {
    "IDs": "662787",
    "lat": "50.621696700000001",
    "lng": "7.2286448999999999",
    "titel": "Web-Entwickler PHP (m/w/d)",
    "jobs": [1759],
    "weight": 1
  },
  {
    "IDs": "662809",
    "lat": "47.689400599999999",
    "lng": "9.8206436999999998",
    "titel": "IT-Systemadministrator ERP (m/w/d)",
    "jobs": [1768],
    "weight": 1
  },
  {
    "IDs": "662812,662813",
    "lat": "51.960664899999998",
    "lng": "7.6261346999999997",
    "titel": "\n",
    "jobs": [1771, 1772],
    "weight": 2
  },
  {
    "IDs": "662824",
    "lat": "51.941211199999998",
    "lng": "9.0985748999999991",
    "titel": "Senior Auditor / Revisor (m/w/d)",
    "jobs": [1775],
    "weight": 1
  },
  {
    "IDs": "662825,652664",
    "lat": "53.079296200000002",
    "lng": "8.8016936000000001",
    "titel": "IT Consultant (Maschinenbau) (m/w/d)\nBauingenieur / Architekt Akquisition / Kalkulation (w/m/d)",
    "jobs": [1776, 2545],
    "weight": 2
  },
  {
    "IDs": "662829,662321,659730,659731",
    "lat": "51.733131499999999",
    "lng": "8.7472071000000007",
    "titel": "Business Unit Controller (m/w/d)\nSoftwareentwickler (w/m/d) Real-Time Testing\n\n",
    "jobs": [1778, 1952, 2345, 2346],
    "weight": 4
  },
  {
    "IDs": "662836",
    "lat": "52.154778",
    "lng": "9.9579652000000003",
    "titel": "Anwendungsadministration (m/w/d) im Bereich HISinOne",
    "jobs": [1784],
    "weight": 1
  },
  {
    "IDs": "662837,662515",
    "lat": "47.556223099999997",
    "lng": "7.9435877000000001",
    "titel": "\nMitarbeiter (w/m/d) Portfolio Management (Equipment)",
    "jobs": [1785, 1879],
    "weight": 2
  },
  {
    "IDs": "662839",
    "lat": "51.130255699999999",
    "lng": "8.0902630999999996",
    "titel": "",
    "jobs": [1786],
    "weight": 1
  },
  {
    "IDs": "662848,662849,661931,661932",
    "lat": "50.719415900000001",
    "lng": "7.1221113999999996",
    "titel": "\n\n\n",
    "jobs": [1790, 1791, 2043, 2044],
    "weight": 4
  },
  {
    "IDs": "662851",
    "lat": "50.868194799999998",
    "lng": "7.1238985000000001",
    "titel": "Bauleiter (m/w/d)",
    "jobs": [1793],
    "weight": 1
  },
  {
    "IDs": "662759,662760,662238,662239",
    "lat": "50.3706368",
    "lng": "8.0160540000000005",
    "titel": "Bauingenieur (m/w/d) mit FH-Diplom / Bachelor-Abschluss der Fachrichtung Bauingenieurwesen\nBauingenieur (m/w/d) mit FH-Diplom / Bachelor-Abschluss der Fachrichtung Bauingenieurwesen\nBauingenieur (m/w/d) (FH/Bachelor)\nBauingenieur (m/w/d) (FH/Bachelor)",
    "jobs": [1796, 1797, 1978, 1979],
    "weight": 4
  },
  {
    "IDs": "662646,660155",
    "lat": "50.912828300000001",
    "lng": "13.341727000000001",
    "titel": "Ingenieur (m/w/d) Energiemanagement / Umweltmanagement\nIngenieur (gn*) Technische Betreuung",
    "jobs": [1802, 2229],
    "weight": 2
  },
  {
    "IDs": "662648",
    "lat": "51.464677299999998",
    "lng": "7.4198285000000004",
    "titel": "Wissenschaftliche Mitarbeiter*innen als Software Developer* der Digitalen Transformation",
    "jobs": [1803],
    "weight": 1
  },
  {
    "IDs": "662650",
    "lat": "48.0966922",
    "lng": "11.5286651",
    "titel": "Produktmanager Digitalisierung (m/w/d) Immobilienwirtschaft",
    "jobs": [1804],
    "weight": 1
  },
  {
    "IDs": "662651,662652",
    "lat": "48.138320399999998",
    "lng": "11.6875629",
    "titel": "\n",
    "jobs": [1805, 1806],
    "weight": 2
  },
  {
    "IDs": "662653,659651,659652,653480",
    "lat": "48.173937299999999",
    "lng": "11.2430079",
    "titel": "Objektleiter/Objektleiterin (m/w/d)\nSystemingenieur (m/w/d)\nSystemingenieur (m/w/d)\n",
    "jobs": [1807, 2331, 2332, 2530],
    "weight": 4
  },
  {
    "IDs": "662657",
    "lat": "51.204196799999998",
    "lng": "6.6879511000000003",
    "titel": "Webentwickler (m/w/d)",
    "jobs": [1808],
    "weight": 1
  },
  {
    "IDs": "662663",
    "lat": "52.296491899999999",
    "lng": "8.8949206000000007",
    "titel": "Referent Personalentwicklung (m/w/d)",
    "jobs": [1809],
    "weight": 1
  },
  {
    "IDs": "662666",
    "lat": "51.105254299999999",
    "lng": "7.6509384000000003",
    "titel": "",
    "jobs": [1810],
    "weight": 1
  },
  {
    "IDs": "662667",
    "lat": "50.558980200000001",
    "lng": "8.5081644999999995",
    "titel": "",
    "jobs": [1811],
    "weight": 1
  },
  {
    "IDs": "662671,662672,662674,662675",
    "lat": "50.103757000000002",
    "lng": "8.6889322999999994",
    "titel": "Software-Entwickler Fullstack (m/w/d)\nSoftware-Entwickler Frontend (m/w/d)\nSoftware-Entwickler Test (m/w/d)\nSoftware-Entwickler Test (m/w/d)",
    "jobs": [1812, 1813, 1815, 1816],
    "weight": 4
  },
  {
    "IDs": "662673",
    "lat": "50.836523300000003",
    "lng": "12.923931700000001",
    "titel": "Redakteur (m/w/d)",
    "jobs": [1814],
    "weight": 1
  },
  {
    "IDs": "662676,659934,659796,657476,657477,656979,657010,656821,656830,656831,656832",
    "lat": "48.562640100000003",
    "lng": "11.263062400000001",
    "titel": "Projektleiter (m/w/d) Nationale und Internationale Projekte\nEntwicklungsingenieur (m/w/d) Hochfrequenz- und Antennentechnik\n\nEntwicklungsingenieur (m/w/d) Mechatronik\nEntwicklungsingenieur (m/w/d) Mechatronik\nEntwicklungsingenieur (m/w/d) Systemsimulation\n\n\n\nEntwicklungsingenieur (m/w/d) Optronik\nEntwicklungsingenieur (m/w/d) Bildverarbeitung",
    "jobs": [1817, 2313, 2321, 2470, 2471, 2482, 2483, 2487, 2488, 2489, 2490],
    "weight": 11
  },
  {
    "IDs": "662681",
    "lat": "49.836382800000003",
    "lng": "8.8328412000000007",
    "titel": "Projektingenieur (m/w/d)",
    "jobs": [1821],
    "weight": 1
  },
  {
    "IDs": "662690,659764,659344,657781",
    "lat": "49.398752399999999",
    "lng": "8.6724335000000004",
    "titel": "\nDesign Assurance Center Engineer (m/f/d)\nSAP FI / CO Berater (m/w/x)\nFPGA Engineer (m/w/d)",
    "jobs": [1828, 2315, 2368, 2451],
    "weight": 4
  },
  {
    "IDs": "662695,662696",
    "lat": "49.011695099999997",
    "lng": "8.4303820999999992",
    "titel": "\n",
    "jobs": [1830, 1831],
    "weight": 2
  },
  {
    "IDs": "662698",
    "lat": "50.555809500000002",
    "lng": "9.6808449000000003",
    "titel": "Projektleiter* Elektrik",
    "jobs": [1832],
    "weight": 1
  },
  {
    "IDs": "662708,662709",
    "lat": "51.893732900000003",
    "lng": "8.2188923000000003",
    "titel": "IT-Mitarbeiter (m/w/d) im Bereich Business Application\nIT-Mitarbeiter (m/w/d) im Bereich Business Application",
    "jobs": [1840, 1841],
    "weight": 2
  },
  {
    "IDs": "662710",
    "lat": "51.417707700000001",
    "lng": "6.8038213000000001",
    "titel": "System- und Netzwerkadministrator (m/w/d)",
    "jobs": [1842],
    "weight": 1
  },
  {
    "IDs": "662718,662719,662291",
    "lat": "48.1518224",
    "lng": "11.5430756",
    "titel": "\n\nProduktmanager (m/w/d) Versicherungen",
    "jobs": [1848, 1849, 1943],
    "weight": 3
  },
  {
    "IDs": "662600,662601",
    "lat": "51.268487700000001",
    "lng": "6.8337874000000003",
    "titel": "Junior Account Manager (m/w/d) B2B im Raum Ratingen\nJunior Account Manager (m/w/d) B2B im Raum Ratingen",
    "jobs": [1855, 1856],
    "weight": 2
  },
  {
    "IDs": "662605",
    "lat": "50.106000600000002",
    "lng": "8.6677324000000002",
    "titel": "",
    "jobs": [1860],
    "weight": 1
  },
  {
    "IDs": "662615",
    "lat": "52.030301199999997",
    "lng": "8.5079381999999999",
    "titel": "Teamleitung Master Data Management (m/w/d)",
    "jobs": [1864],
    "weight": 1
  },
  {
    "IDs": "662617,662618",
    "lat": "52.372385800000004",
    "lng": "9.6890537000000005",
    "titel": "Bauleiter/Bauleiterin (m/w/d)\nBauleiter/Bauleiterin (m/w/d)",
    "jobs": [1866, 1867],
    "weight": 2
  },
  {
    "IDs": "662619,662620",
    "lat": "49.844016199999999",
    "lng": "7.8731346000000002",
    "titel": "Energiemanager (m/w/d)\nEnergiemanager (m/w/d)",
    "jobs": [1868, 1869],
    "weight": 2
  },
  {
    "IDs": "662627",
    "lat": "48.900449199999997",
    "lng": "9.3721061999999993",
    "titel": "",
    "jobs": [1872],
    "weight": 1
  },
  {
    "IDs": "662582,659241,637174,637177,637178",
    "lat": "48.661603700000001",
    "lng": "9.3501335999999995",
    "titel": "Bauleiter (m/w/d)\nSenior Kalkulator Systembau (w/m/d)\n\n\n",
    "jobs": [1875, 2373, 2650, 2651, 2652],
    "weight": 5
  },
  {
    "IDs": "662497",
    "lat": "48.707455799999998",
    "lng": "9.0044053000000002",
    "titel": "Bauingenieur (m/w/d) Tragwerksplanung",
    "jobs": [1876],
    "weight": 1
  },
  {
    "IDs": "662504",
    "lat": "50.684350199999997",
    "lng": "10.9254728",
    "titel": "Softwareentwickler (w/m/d)",
    "jobs": [1878],
    "weight": 1
  },
  {
    "IDs": "662516,662365,661868,660462,653183,653186,651577",
    "lat": "49.124971199999997",
    "lng": "8.5844106999999994",
    "titel": "Entwicklungsingenieur Getriebekomponenten Welle-Nabe-Verbindungen (w/m/d)\nGruppenleiter TestCenter Drives - Industrial Gears (w/m/d)\nDichtungsspezialist (w/m/d)\nInternationaler Key Account Manager (w/m/d)\nSoftware Engineer C#/.NET Automatisierungstechnik (w/m/d)\nEmbedded Softwareentwickler Industrial Ethernet Systeme (w/m/d)\n",
    "jobs": [1880, 1925, 2056, 2197, 2538, 2539, 2565],
    "weight": 7
  },
  {
    "IDs": "662532,661901",
    "lat": "50.105349099999998",
    "lng": "8.1976788000000003",
    "titel": "IT Program Manager mit Schwerpunkt ERP (m/w/d)\nSachbearbeiter (m/w/d) mit Schwerpunkt Personalbeschaffung (Recruiting)",
    "jobs": [1888, 2070],
    "weight": 2
  },
  {
    "IDs": "662413",
    "lat": "50.385786000000003",
    "lng": "7.5816790000000003",
    "titel": "Softwareentwickler (w/m/d)",
    "jobs": [1899],
    "weight": 1
  },
  {
    "IDs": "662438,662439,662440,662441",
    "lat": "48.748327699999997",
    "lng": "9.0899180000000008",
    "titel": "Wissenschaftliche*r Mitarbeiter*in - Roboter- und Assistenzsysteme\nWissenschaftliche*r Mitarbeiter*in - Roboter- und Assistenzsysteme\n\n",
    "jobs": [1906, 1907, 1908, 1909],
    "weight": 4
  },
  {
    "IDs": "662456",
    "lat": "54.688460599999999",
    "lng": "8.5564043999999999",
    "titel": "",
    "jobs": [1911],
    "weight": 1
  },
  {
    "IDs": "662484",
    "lat": "51.978255900000001",
    "lng": "7.6378542999999999",
    "titel": "Java Anwendungsentwickler/in (m/w/d)",
    "jobs": [1917],
    "weight": 1
  },
  {
    "IDs": "662360,662361",
    "lat": "50.982928700000002",
    "lng": "6.8693678",
    "titel": "\n",
    "jobs": [1921, 1922],
    "weight": 2
  },
  {
    "IDs": "662373",
    "lat": "48.840851499999999",
    "lng": "12.957478699999999",
    "titel": "SAP Business One (Junior) Berater (m/w/x)",
    "jobs": [1927],
    "weight": 1
  },
  {
    "IDs": "662376",
    "lat": "48.140883799999997",
    "lng": "11.299713000000001",
    "titel": "Online Marketing Manager (m/w/d)",
    "jobs": [1929],
    "weight": 1
  },
  {
    "IDs": "662381",
    "lat": "49.226260600000003",
    "lng": "9.3798843000000005",
    "titel": "Testingenieur Software und Systeme (m/w/d)",
    "jobs": [1931],
    "weight": 1
  },
  {
    "IDs": "662383",
    "lat": "53.532340300000001",
    "lng": "8.1068721999999998",
    "titel": "SAP Entwickler (m/w/d)",
    "jobs": [1933],
    "weight": 1
  },
  {
    "IDs": "662397,662398",
    "lat": "48.875004599999997",
    "lng": "9.3971423000000005",
    "titel": "\n",
    "jobs": [1935, 1936],
    "weight": 2
  },
  {
    "IDs": "662402,662403",
    "lat": "53.531648400000002",
    "lng": "9.9852574000000001",
    "titel": "IT-Systemadministrator (m/w/d)\nIT-Systemadministrator (m/w/d)",
    "jobs": [1937, 1938],
    "weight": 2
  },
  {
    "IDs": "662300",
    "lat": "51.233068000000003",
    "lng": "6.7190874000000003",
    "titel": "IT Systemadministrator (m/w/d)",
    "jobs": [1945],
    "weight": 1
  },
  {
    "IDs": "662311,662312",
    "lat": "50.168518499999998",
    "lng": "8.5727834999999999",
    "titel": "\n",
    "jobs": [1948, 1949],
    "weight": 2
  },
  {
    "IDs": "662316",
    "lat": "49.4985401",
    "lng": "8.4886940000000006",
    "titel": "Full-Stack-Webentwickler (m/w/d)",
    "jobs": [1950],
    "weight": 1
  },
  {
    "IDs": "662322,662323",
    "lat": "53.255072800000001",
    "lng": "7.9263659999999998",
    "titel": "(Junior-) Entwickler ASP.NET / C# (m/w/d)\n(Junior-) Entwickler ASP.NET / C# (m/w/d)",
    "jobs": [1953, 1954],
    "weight": 2
  },
  {
    "IDs": "662327",
    "lat": "50.974418",
    "lng": "7.0122910000000003",
    "titel": "Unternehmensberater (m/w/d)",
    "jobs": [1958],
    "weight": 1
  },
  {
    "IDs": "662330,659631,659632",
    "lat": "47.766174599999999",
    "lng": "9.1702771999999992",
    "titel": "Systemmanager (m/w/d) Microsoft\nSoftware-Entwicklungsingenieur (m/w/d) Phyton / Java\nSoftware-Entwicklungsingenieur (m/w/d) Phyton / Java",
    "jobs": [1961, 2324, 2325],
    "weight": 3
  },
  {
    "IDs": "662270",
    "lat": "48.890134600000003",
    "lng": "8.6821921999999994",
    "titel": "Operations Administrator (m/w/d)",
    "jobs": [1990],
    "weight": 1
  },
  {
    "IDs": "662183",
    "lat": "51.628127499999998",
    "lng": "12.1195606",
    "titel": "Junior Produktspezialist (m/w/d) Sortimentsbereich Reinigung, Hygiene &amp; Desinfektion",
    "jobs": [1991],
    "weight": 1
  },
  {
    "IDs": "662135",
    "lat": "53.146569599999999",
    "lng": "7.7935626999999998",
    "titel": "Prozessmanager (m/w/d)",
    "jobs": [1992],
    "weight": 1
  },
  {
    "IDs": "662141,662142",
    "lat": "50.870134499999999",
    "lng": "9.7019675000000003",
    "titel": "\n",
    "jobs": [1995, 1996],
    "weight": 2
  },
  {
    "IDs": "662153",
    "lat": "49.455006699999998",
    "lng": "11.079515600000001",
    "titel": "Softwareentwickler / Informatiker (Bachelor) sowie Fachinformatiker Anwendungsentwicklung (m/w/d)",
    "jobs": [1998],
    "weight": 1
  },
  {
    "IDs": "662156",
    "lat": "51.376509599999999",
    "lng": "7.6960841999999996",
    "titel": "Finance Manager / Finance Senior Specialist (m/w/d)",
    "jobs": [2000],
    "weight": 1
  },
  {
    "IDs": "662172,662173,658782,658783",
    "lat": "52.3173484",
    "lng": "7.7820790999999998",
    "titel": "Ingenieur / Techniker Versorgungstechnik (m/w/d)\nIngenieur / Techniker Versorgungstechnik (m/w/d)\nVerpackungsentwickler (m/w/d)\nVerpackungsentwickler (m/w/d)",
    "jobs": [2007, 2008, 2401, 2402],
    "weight": 4
  },
  {
    "IDs": "662177",
    "lat": "51.490745099999998",
    "lng": "7.5079783000000004",
    "titel": "Ingenieur (m/w/d) als Projektleiter Tiefbau",
    "jobs": [2010],
    "weight": 1
  },
  {
    "IDs": "662071",
    "lat": "48.244159600000003",
    "lng": "10.983642",
    "titel": "Administrator Linux (w/m/d)",
    "jobs": [2016],
    "weight": 1
  },
  {
    "IDs": "662080",
    "lat": "47.747688599999996",
    "lng": "8.7106200999999999",
    "titel": "Grafikdesigner/Mediengestalter Digital/Print (m/w/d)",
    "jobs": [2017],
    "weight": 1
  },
  {
    "IDs": "662081",
    "lat": "47.961702600000002",
    "lng": "12.5987194",
    "titel": "Fachreferent Personalwirtschaftssysteme SAP/HR (m/w/d)",
    "jobs": [2018],
    "weight": 1
  },
  {
    "IDs": "662082",
    "lat": "50.2279312",
    "lng": "8.6142087000000007",
    "titel": "IT-Administrator Service und Support (m/w/d)",
    "jobs": [2019],
    "weight": 1
  },
  {
    "IDs": "661982,661983",
    "lat": "51.104540700000001",
    "lng": "13.2017384",
    "titel": "Bauleiterin / Bauleiter (m/w/d)\nBauleiterin / Bauleiter (m/w/d)",
    "jobs": [2029, 2030],
    "weight": 2
  },
  {
    "IDs": "662016",
    "lat": "48.9966449",
    "lng": "12.1671473",
    "titel": "Innenrevisor (m/w/d)",
    "jobs": [2033],
    "weight": 1
  },
  {
    "IDs": "662022,660015,660016",
    "lat": "48.685203799999996",
    "lng": "10.1453533",
    "titel": "\nStandardization Engineer/Normeningenieur (m/w/d) mit Schwerpunkt Gefahrstoffmanagement\nStandardization Engineer/Normeningenieur (m/w/d) mit Schwerpunkt Gefahrstoffmanagement",
    "jobs": [2035, 2271, 2272],
    "weight": 3
  },
  {
    "IDs": "662050,662051",
    "lat": "52.687484499999997",
    "lng": "13.5672765",
    "titel": "PHP-Entwickler (m/w/d)\nPHP-Entwickler (m/w/d)",
    "jobs": [2038, 2039],
    "weight": 2
  },
  {
    "IDs": "662056,659777",
    "lat": "48.4511532",
    "lng": "11.769179899999999",
    "titel": "IT-Produktion und Infrastruktur Spezialist (m/w/d)\nTrainee Fachbereich Maschinenbau (m/w/d)",
    "jobs": [2040, 2316],
    "weight": 2
  },
  {
    "IDs": "662057",
    "lat": "50.072672099999998",
    "lng": "8.2570236999999995",
    "titel": "Art-Director (m/w/d)",
    "jobs": [2041],
    "weight": 1
  },
  {
    "IDs": "661938",
    "lat": "48.856555800000002",
    "lng": "8.7404423999999992",
    "titel": "Leiter (m/w/d) Service",
    "jobs": [2045],
    "weight": 1
  },
  {
    "IDs": "661852",
    "lat": "48.715742800000001",
    "lng": "9.1178139999999992",
    "titel": "DevOps Engineer / Site Reliability Engineer (m/w/d)",
    "jobs": [2053],
    "weight": 1
  },
  {
    "IDs": "661871,661872",
    "lat": "49.634137199999998",
    "lng": "8.3507181999999993",
    "titel": "\n",
    "jobs": [2059, 2060],
    "weight": 2
  },
  {
    "IDs": "661881,661882,661786,661787,650018,650019,649624,649355,649242,649244,649245,649246,649141,649142,649143,649144,648244,648245,648325,648326",
    "lat": "52.268873599999999",
    "lng": "10.5267696",
    "titel": "Redakteur (m/w/d) Geographie\nRedakteur (m/w/d) Geographie\n\n\nSoftware Entwickler E-Mobility Ladeinfrastruktur (m/w/d)\nSoftware Entwickler E-Mobility Ladeinfrastruktur (m/w/d)\nSoftware Developer Automotive (m/w/d)\nSenior WebApp Entwickler/Architekt Automotive (m/w/d)\nJunior Embedded-Softwareentwickler Automotive (m/w/d)\nIngenieur Autonomes Fahren (m/w/d)\nIngenieur Autonomes Fahren (m/w/d)\nApplikationsingenieur FAS / Autonomes Fahren (m/w/d)\nSenior Embedded-Softwareentwickler Automotive (m/w/d)\nPython Entwickler Automotive (m/w/d)\nJunior Ingenieur HIL-Testing (m/w/d)\nIngenieur Modellbasierte Softwareentwicklung (m/w/d)\nSystemtestmanager/Testmanager Infotainment HMI (m/w/d)\nSystemtestmanager/Testmanager Infotainment HMI (m/w/d)\nSoftware Testingenieur mob. Onlinedienste/Infotainment (m/w/d)\nSoftware Testingenieur mob. Onlinedienste/Infotainment (m/w/d)",
    "jobs": [
      2062,
      2063,
      2086,
      2087,
      2579,
      2580,
      2594,
      2604,
      2609,
      2610,
      2611,
      2612,
      2613,
      2614,
      2615,
      2616,
      2623,
      2624,
      2625,
      2626
    ],
    "weight": 20
  },
  {
    "IDs": "661896,661897,657951",
    "lat": "49.467770700000003",
    "lng": "7.1690624999999999",
    "titel": "Projektmanager Kunststofftechnik (Extrusion) (m/w/d)\nProjektmanager Kunststofftechnik (Extrusion) (m/w/d)\nProjektmanager Industrialisierung (m/w/d)",
    "jobs": [2068, 2069, 2426],
    "weight": 3
  },
  {
    "IDs": "661774",
    "lat": "52.554640900000003",
    "lng": "13.539811",
    "titel": "Vertriebsmitarbeiter (m/w/d) mit technischem Hintergrund",
    "jobs": [2084],
    "weight": 1
  },
  {
    "IDs": "661803",
    "lat": "49.943702199999997",
    "lng": "7.9225329000000002",
    "titel": "Spieleentwickler (m/w/d)",
    "jobs": [2089],
    "weight": 1
  },
  {
    "IDs": "661813",
    "lat": "47.778270399999997",
    "lng": "9.6121303000000005",
    "titel": "Anwendungsentwickler IBM i Business Applications (m/w/i)",
    "jobs": [2095],
    "weight": 1
  },
  {
    "IDs": "661821",
    "lat": "48.074818899999997",
    "lng": "8.7347581999999999",
    "titel": "Hardware Entwickler - Functional Safety (m/w/d)",
    "jobs": [2097],
    "weight": 1
  },
  {
    "IDs": "661669,661692",
    "lat": "50.204566399999997",
    "lng": "9.1863724999999992",
    "titel": "\n",
    "jobs": [2100, 2105],
    "weight": 2
  },
  {
    "IDs": "661690,661691",
    "lat": "51.311787099999997",
    "lng": "13.267700400000001",
    "titel": "Bauingenieur (m/w/d)\nBauingenieur (m/w/d)",
    "jobs": [2103, 2104],
    "weight": 2
  },
  {
    "IDs": "661711",
    "lat": "50.125275100000003",
    "lng": "8.6869633000000004",
    "titel": "GTO IT Excellence (m/w/d)",
    "jobs": [2107],
    "weight": 1
  },
  {
    "IDs": "661716,661717",
    "lat": "53.050305000000002",
    "lng": "8.7827538999999994",
    "titel": "Entwicklungsingenieur (m/w/d) Windturbinenregelung / Lastensimulation\nEntwicklungsingenieur (m/w/d) Windturbinenregelung / Lastensimulation",
    "jobs": [2108, 2109],
    "weight": 2
  },
  {
    "IDs": "661743,661744",
    "lat": "51.9845094",
    "lng": "9.2865901999999991",
    "titel": "\n",
    "jobs": [2120, 2121],
    "weight": 2
  },
  {
    "IDs": "661597",
    "lat": "48.569755700000002",
    "lng": "10.5234843",
    "titel": "IT Solution Architect (m/w/d) - variant configuration",
    "jobs": [2126],
    "weight": 1
  },
  {
    "IDs": "661605",
    "lat": "52.117830499999997",
    "lng": "8.6793998000000006",
    "titel": "Softwareentwickler (m/w/d) im Bereich Entgeltabrechnung",
    "jobs": [2129],
    "weight": 1
  },
  {
    "IDs": "661606,661607,659834",
    "lat": "48.639425500000002",
    "lng": "9.0181128000000008",
    "titel": "\n\nSpezialist (m/w/d)",
    "jobs": [2130, 2131, 2287],
    "weight": 3
  },
  {
    "IDs": "661653",
    "lat": "52.167671400000003",
    "lng": "9.9229728000000001",
    "titel": "",
    "jobs": [2140],
    "weight": 1
  },
  {
    "IDs": "660482,660483",
    "lat": "54.083894899999997",
    "lng": "12.1666436",
    "titel": "\n",
    "jobs": [2143, 2144],
    "weight": 2
  },
  {
    "IDs": "660499,660500",
    "lat": "48.172310199999998",
    "lng": "11.715909699999999",
    "titel": "Account Manager (Mensch*)\nAccount Manager (Mensch*)",
    "jobs": [2150, 2151],
    "weight": 2
  },
  {
    "IDs": "660502,660503,654333,654334",
    "lat": "48.096693100000003",
    "lng": "11.627407099999999",
    "titel": "\n\n\n",
    "jobs": [2152, 2153, 2525, 2526],
    "weight": 4
  },
  {
    "IDs": "660532,660463,660464,660465",
    "lat": "51.571147600000003",
    "lng": "8.1057539999999992",
    "titel": "\nSales Planning Manager (m/w/d)\nSales Planning Manager (m/w/d)\nSenior Sales Manager (m/w/d)",
    "jobs": [2156, 2198, 2199, 2200],
    "weight": 4
  },
  {
    "IDs": "660536",
    "lat": "50.0734195",
    "lng": "8.6361501999999994",
    "titel": "Mathematiker (m/w/d) / Business Intelligence Specialist",
    "jobs": [2157],
    "weight": 1
  },
  {
    "IDs": "660377",
    "lat": "50.649273600000001",
    "lng": "11.3661502",
    "titel": "SAP PP Berater (m/w/x)",
    "jobs": [2170],
    "weight": 1
  },
  {
    "IDs": "660382,660383,660466,660467",
    "lat": "52.376383199999999",
    "lng": "9.8026932999999996",
    "titel": "\n\nMathematiker (m/w/d) Quotierung und Pricing\nMathematiker (m/w/d) Quotierung und Pricing",
    "jobs": [2171, 2172, 2201, 2202],
    "weight": 4
  },
  {
    "IDs": "660384",
    "lat": "48.992291299999998",
    "lng": "8.3831667000000003",
    "titel": "",
    "jobs": [2173],
    "weight": 1
  },
  {
    "IDs": "660385,660386",
    "lat": "48.799606500000003",
    "lng": "9.4792106999999994",
    "titel": "IT-Systemadministrator / ERP-Systembetreuer (m/w/d)\nIT-Systemadministrator / ERP-Systembetreuer (m/w/d)",
    "jobs": [2174, 2175],
    "weight": 2
  },
  {
    "IDs": "660391",
    "lat": "48.003398799999999",
    "lng": "7.8891784999999999",
    "titel": "Vertriebscontroller (m/w/d)",
    "jobs": [2176],
    "weight": 1
  },
  {
    "IDs": "660395,660396,658967,658968",
    "lat": "51.938294399999997",
    "lng": "7.1675830999999999",
    "titel": "Mitarbeiter (w/m/d) Krankenhauscontrolling und betriebswirtschaftl. Steuerung\nMitarbeiter (w/m/d) Krankenhauscontrolling und betriebswirtschaftl. Steuerung\nIT-Administratorin (w/m/d)\nIT-Administratorin (w/m/d)",
    "jobs": [2177, 2178, 2393, 2394],
    "weight": 4
  },
  {
    "IDs": "660399,660400",
    "lat": "48.2928997",
    "lng": "9.6612346999999996",
    "titel": "Energieberater (m/w/d)\nEnergieberater (m/w/d)",
    "jobs": [2179, 2180],
    "weight": 2
  },
  {
    "IDs": "660428,660429",
    "lat": "48.1106014",
    "lng": "11.470056400000001",
    "titel": "Mitarbeiter (m/w/d) im Personalwesen mit dem Schwerpunkt Arbeitszeit\nMitarbeiter (m/w/d) im Personalwesen mit dem Schwerpunkt Arbeitszeit",
    "jobs": [2186, 2187],
    "weight": 2
  },
  {
    "IDs": "660257",
    "lat": "51.489907799999997",
    "lng": "9.1451899999999995",
    "titel": "Junior-Wirtschaftsingenieur mit Schwerpunkt KVP/CIP (m/w/d)",
    "jobs": [2204],
    "weight": 1
  },
  { "IDs": "660262", "lat": "52.368017899999998", "lng": "14.0594725", "titel": "", "jobs": [2205], "weight": 1 },
  {
    "IDs": "660266",
    "lat": "51.426277399999996",
    "lng": "6.8826846000000002",
    "titel": "Manager Pricing (m/w/x)",
    "jobs": [2206],
    "weight": 1
  },
  {
    "IDs": "660287",
    "lat": "49.302001799999999",
    "lng": "12.287155800000001",
    "titel": "Werkscontroller / Plant Controller (m/w/d)",
    "jobs": [2208],
    "weight": 1
  },
  {
    "IDs": "660158,660159",
    "lat": "51.406840600000002",
    "lng": "6.9881259",
    "titel": "PHP-Softwareentwickler (m/w/d)\nPHP-Softwareentwickler (m/w/d)",
    "jobs": [2230, 2231],
    "weight": 2
  },
  {
    "IDs": "660170",
    "lat": "52.198835000000003",
    "lng": "8.5777546999999998",
    "titel": "Assistent (m/w/d) Produktmanagement",
    "jobs": [2233],
    "weight": 1
  },
  {
    "IDs": "660172,660173,657583",
    "lat": "47.999961499999998",
    "lng": "11.339009000000001",
    "titel": "\n\nEinrichtungsleitung (m/w/d)",
    "jobs": [2234, 2235, 2466],
    "weight": 3
  },
  {
    "IDs": "660211",
    "lat": "50.934707000000003",
    "lng": "6.9759561999999997",
    "titel": "Senior Software Developer (m/w/d)",
    "jobs": [2243],
    "weight": 1
  },
  {
    "IDs": "660104",
    "lat": "48.662887300000001",
    "lng": "9.2094818000000007",
    "titel": "Personalsachbearbeiter (w/m/d)",
    "jobs": [2251],
    "weight": 1
  },
  {
    "IDs": "659946",
    "lat": "48.793768499999999",
    "lng": "9.7988852000000009",
    "titel": "",
    "jobs": [2256],
    "weight": 1
  },
  {
    "IDs": "659954",
    "lat": "48.684573800000003",
    "lng": "9.8067931999999995",
    "titel": "",
    "jobs": [2258],
    "weight": 1
  },
  {
    "IDs": "659958,659959",
    "lat": "49.543185299999998",
    "lng": "8.3512342000000004",
    "titel": "Business Controller (m/w/d)\nBusiness Controller (m/w/d)",
    "jobs": [2260, 2261],
    "weight": 2
  },
  {
    "IDs": "659977,659978",
    "lat": "49.441805500000001",
    "lng": "11.123419800000001",
    "titel": "Bauingenieur (m/w/d) Siedlungswasserwirtschaft, Schwerpunkt Wasserversorgung\nBauingenieur (m/w/d) Siedlungswasserwirtschaft, Schwerpunkt Wasserversorgung",
    "jobs": [2265, 2266],
    "weight": 2
  },
  {
    "IDs": "660026",
    "lat": "49.369339400000001",
    "lng": "8.6935081000000007",
    "titel": "",
    "jobs": [2275],
    "weight": 1
  },
  {
    "IDs": "659831,659832,659782",
    "lat": "51.881944799999999",
    "lng": "8.5061035",
    "titel": "Webentwickler/Systemadministrator Backend-Systeme (m/w/d)\nWebentwickler/Systemadministrator Backend-Systeme (m/w/d)\nWebentwickler Backend/CMS-Developer (m/w/d)",
    "jobs": [2285, 2286, 2319],
    "weight": 3
  },
  {
    "IDs": "659839,659840",
    "lat": "51.75",
    "lng": "9.3833330000000004",
    "titel": "Systemadministrator (m/w/d)\nSystemadministrator (m/w/d)",
    "jobs": [2289, 2290],
    "weight": 2
  },
  {
    "IDs": "659865",
    "lat": "48.803550799999996",
    "lng": "8.3212583999999996",
    "titel": "Projektleiter (m/w/d) Grips&amp;Co",
    "jobs": [2293],
    "weight": 1
  },
  {
    "IDs": "659874",
    "lat": "52.208462300000001",
    "lng": "8.8009705999999994",
    "titel": "Webentwickler (m/w/d)",
    "jobs": [2294],
    "weight": 1
  },
  {
    "IDs": "659887,659637,659648",
    "lat": "48.185301600000003",
    "lng": "11.7203686",
    "titel": "Senior IT Systems Engineer Cloud / Openstack (m/w/d)\nSoftware Testmanager (m/w/d)\nSoftware Tester (m/w/d)",
    "jobs": [2301, 2328, 2330],
    "weight": 3
  },
  {
    "IDs": "659812",
    "lat": "47.632725299999997",
    "lng": "8.2719155000000004",
    "titel": "ORBIS-Fachberater (m/w/d)",
    "jobs": [2314],
    "weight": 1
  },
  {
    "IDs": "659635,659636",
    "lat": "53.5329275",
    "lng": "13.2623187",
    "titel": "Architekt / Bauingenieur (m/w/d)\nArchitekt / Bauingenieur (m/w/d)",
    "jobs": [2326, 2327],
    "weight": 2
  },
  {
    "IDs": "659674",
    "lat": "51.215384899999997",
    "lng": "6.7975715000000001",
    "titel": "IT-Revisor (m/w/d)",
    "jobs": [2333],
    "weight": 1
  },
  {
    "IDs": "659680",
    "lat": "50.086611499999997",
    "lng": "9.0719594000000008",
    "titel": "Projektmanager (m/w/d) Controlling",
    "jobs": [2337],
    "weight": 1
  },
  {
    "IDs": "659687,659688",
    "lat": "50.049154999999999",
    "lng": "8.1878001000000005",
    "titel": "Projekt Referent / Projekt Management Office - PMO (m/w/d)\nProjekt Referent / Projekt Management Office - PMO (m/w/d)",
    "jobs": [2339, 2340],
    "weight": 2
  },
  {
    "IDs": "659570,659571,645714",
    "lat": "0",
    "lng": "0",
    "titel": "\n\nTeamleiter Ersatzteile (m/w/d) Technologische Dienstleistungen",
    "jobs": [2351, 2352, 2629],
    "weight": 3
  },
  {
    "IDs": "659471,659472,649201,649202,649203,648890",
    "lat": "52.420678600000002",
    "lng": "10.770025800000001",
    "titel": "Web Application Development (f/m/d)\nWeb Application Development (f/m/d)\nIngenieur Automotive / Simulation und Modellierung (m/w/d)\nIngenieur Automotive / Simulation und Modellierung (m/w/d)\nIngenieur Testautomatisierung Automotive (m/w/d)\nTestautomatisierer Infotainment-Test (m/w/d)",
    "jobs": [2356, 2357, 2606, 2607, 2608, 2617],
    "weight": 6
  },
  {
    "IDs": "659476",
    "lat": "48.190922299999997",
    "lng": "11.863020799999999",
    "titel": "",
    "jobs": [2358],
    "weight": 1
  },
  {
    "IDs": "659380,659381",
    "lat": "51.8402587",
    "lng": "8.0308796000000005",
    "titel": "SAP FI / CO Berater (m/w/x)\nSAP FI / CO Berater (m/w/x)",
    "jobs": [2362, 2363],
    "weight": 2
  },
  {
    "IDs": "659216",
    "lat": "52.164940600000001",
    "lng": "7.8390396999999998",
    "titel": "SAP SD/EWM Inhouse Consultant (m/w/d)",
    "jobs": [2370],
    "weight": 1
  },
  {
    "IDs": "659225",
    "lat": "48.110442599999999",
    "lng": "11.585906",
    "titel": "Medical Affairs Manager Onkologie (m/w/d)",
    "jobs": [2372],
    "weight": 1
  },
  {
    "IDs": "659247",
    "lat": "51.664307899999997",
    "lng": "6.6295678999999996",
    "titel": "",
    "jobs": [2374],
    "weight": 1
  },
  {
    "IDs": "659153",
    "lat": "51.250351199999997",
    "lng": "6.6907173000000002",
    "titel": "",
    "jobs": [2380],
    "weight": 1
  },
  {
    "IDs": "659018,659059,658893,658663,657993,657567",
    "lat": "48.450920199999999",
    "lng": "12.352586799999999",
    "titel": "Employee (m/w/d) Planning Building (Bauplanung)\nEmployee (m/w/d) Planning Sites (Werksplanung)\nSAP MM / WM Key User (m/w/x)\nVersuchstechniker/-ingenieur (m/w/d) im Bereich EMV\n\nMitarbeiter (m/w/d) Schadteilanalyse",
    "jobs": [2388, 2391, 2398, 2411, 2429, 2462],
    "weight": 6
  },
  {
    "IDs": "658840",
    "lat": "50.177497799999998",
    "lng": "11.118286299999999",
    "titel": "SAP BW / BI Berater (m/w/x)",
    "jobs": [2396],
    "weight": 1
  },
  {
    "IDs": "658784,657867,657868,655619,647612,643007,643031",
    "lat": "48.682464199999998",
    "lng": "8.1500316999999995",
    "titel": "\nSystemingenieur Leistungselektronik Antriebsinverter Automotive (m/w/d)\nApplikations- und Versuchsingenieur Leistungselektronik (m/w/d)\nIngenieur E-Maschinenmodellierung mittels dSpace (m/w/d)\n\nFunktionsentwickler Funktionale Sicherheit (m/w/d)\n",
    "jobs": [2403, 2436, 2437, 2504, 2627, 2634, 2635],
    "weight": 7
  },
  {
    "IDs": "658629",
    "lat": "51.536894799999999",
    "lng": "7.2009147000000002",
    "titel": "SAP FI / CO Berater (m/w/x)",
    "jobs": [2404],
    "weight": 1
  },
  {
    "IDs": "658636",
    "lat": "51.451604099999997",
    "lng": "6.6408148000000002",
    "titel": "SAP FI / CO Berater (m/w/x)",
    "jobs": [2406],
    "weight": 1
  },
  {
    "IDs": "658644",
    "lat": "48.9276926",
    "lng": "8.3989212999999996",
    "titel": "Projektingenieur Anlagenvisualisierung SCADA/HMI (m/w/d)",
    "jobs": [2409],
    "weight": 1
  },
  {
    "IDs": "658679",
    "lat": "48.678197400000002",
    "lng": "9.2161352999999995",
    "titel": "SAP SD Berater (m/w/x) - SAP SD Consultant - SAP SD Inhouse Position",
    "jobs": [2412],
    "weight": 1
  },
  {
    "IDs": "658254",
    "lat": "47.070714000000002",
    "lng": "15.439503999999999",
    "titel": "Konstrukteur (m/w/d) Verlegung 3D",
    "jobs": [2420],
    "weight": 1
  },
  {
    "IDs": "657953",
    "lat": "47.950246900000003",
    "lng": "9.6377895999999996",
    "titel": "EDI Berater (m/w/x) - EDI Consultant / Experte (m/w/x) - EDI Spezialisten Inhouse Position",
    "jobs": [2427],
    "weight": 1
  },
  {
    "IDs": "657857",
    "lat": "48.8456799",
    "lng": "12.9779283",
    "titel": "Hardwareentwickler (m/w/d)",
    "jobs": [2435],
    "weight": 1
  },
  {
    "IDs": "657794",
    "lat": "51.351005999999998",
    "lng": "9.5263416000000003",
    "titel": "SAP ABAP Entwickler (m/w/x)",
    "jobs": [2452],
    "weight": 1
  },
  {
    "IDs": "657629",
    "lat": "49.281573899999998",
    "lng": "9.1624618000000009",
    "titel": "SAP Basis (Junior) Berater (m/w/x) - SAP Basis Consultant - SAP Basis (Junior) Inhouse Position",
    "jobs": [2453],
    "weight": 1
  },
  {
    "IDs": "657551",
    "lat": "51.721279199999998",
    "lng": "8.8341562000000007",
    "titel": "Junior Fullstack Softwareentwickler (m/w)",
    "jobs": [2460],
    "weight": 1
  },
  {
    "IDs": "656317",
    "lat": "48.718582599999998",
    "lng": "10.777804100000001",
    "titel": "Systemanalytiker NH90 (m/w/d)",
    "jobs": [2495],
    "weight": 1
  },
  {
    "IDs": "656225,656226",
    "lat": "48.1103758",
    "lng": "11.7321151",
    "titel": "\n",
    "jobs": [2498, 2499],
    "weight": 2
  },
  {
    "IDs": "656042",
    "lat": "51.165219899999997",
    "lng": "7.0671160999999998",
    "titel": "Microsoft Azure - Spezialist (m/w/d)",
    "jobs": [2501],
    "weight": 1
  },
  { "IDs": "656073", "lat": "48.4523005", "lng": "13.206031400000001", "titel": "", "jobs": [2502], "weight": 1 },
  {
    "IDs": "655211,652673",
    "lat": "51.711351499999999",
    "lng": "8.7542576000000007",
    "titel": "Stahlbauingenieur (B.A./M.A.) (w/m/d)\nElektroingenieur / Elektrotechniker (w/m/d)",
    "jobs": [2508, 2546],
    "weight": 2
  },
  {
    "IDs": "654820,654821",
    "lat": "48.103606999999997",
    "lng": "11.6335649",
    "titel": "\n",
    "jobs": [2511, 2512],
    "weight": 2
  },
  {
    "IDs": "653702,653703,653524",
    "lat": "50.8472857",
    "lng": "12.463722300000001",
    "titel": "Applikationsingenieur Fabrikautomatisierung (w/m/d)\nApplikationsingenieur Fabrikautomatisierung (w/m/d)\n",
    "jobs": [2527, 2528, 2533],
    "weight": 3
  },
  {
    "IDs": "653714",
    "lat": "48.038978700000001",
    "lng": "11.6265608",
    "titel": "Erzieher (m/w/d)",
    "jobs": [2529],
    "weight": 1
  },
  {
    "IDs": "652773,652774,640383",
    "lat": "48.126295300000002",
    "lng": "11.633072800000001",
    "titel": "Nachtdienst\nNachtdienst\n",
    "jobs": [2540, 2541, 2644],
    "weight": 3
  },
  {
    "IDs": "652424,652425,652426,652457,652458",
    "lat": "48.750567199999999",
    "lng": "11.4578898",
    "titel": "Junior Embedded-Softwareentwickler Automotive (m/w/d)\nSenior Ingenieur HiL-Testing (m/w/d)\nIngenieur Testautomatisierung Automotive (m/w/d)\nIngenieur Autonomes Fahren (m/w/d)\nSenior Embedded-Softwareentwickler Automotive (m/w/d)",
    "jobs": [2551, 2552, 2553, 2557, 2558],
    "weight": 5
  },
  {
    "IDs": "651936,649659,649667,649668,649669,649670,649671",
    "lat": "52.422650300000001",
    "lng": "10.786546100000001",
    "titel": "Ing Requirements Eng./Anforderungsmanagement Automotive (m/w/d)\nKfz-Meister / Techniker oder Ingenieur Fahrzeugtechnik (m/w/d)\nConsultant Automotive (m/w/d)\nConsultant Automotive (m/w/d)\nConsultant Requirements Engineering IT / Elektrotechnik (m/w/d)\n\nProjektassistenz (m/w/d)",
    "jobs": [2564, 2596, 2597, 2598, 2599, 2600, 2601],
    "weight": 7
  },
  { "IDs": "650192", "lat": "50.2303566", "lng": "8.7736532999999994", "titel": "", "jobs": [2577], "weight": 1 },
  {
    "IDs": "650069,650070,650071,650072,650074,650075,650076,650077,650078,650079",
    "lat": "48.810743000000002",
    "lng": "11.369100700000001",
    "titel": "Entwicklungsingenieur (m/w/d) Fahrdynamikregelsysteme\nEntwicklungsingenieur (m/w/d) Fahrdynamikregelsysteme\n\n\nSoftwareentwickler (m/w/d) Messdatenmanagement\nSoftwareentwickler (m/w/d) Messdatenmanagement\nScrum Master (m/w/d) Automotive\nSoftwareentwickler (m/w) Automatisierte Fahrfunktionen\nSoftwareentwickler (m/w/d) Maschinelles Lernen Vorentwicklung Autonomes Fahren\nSoftwareentwickler (m/w/d) Trajektorienplanung Vorentwicklung Autonomes Fahren",
    "jobs": [2582, 2583, 2584, 2585, 2586, 2587, 2588, 2589, 2590, 2591],
    "weight": 10
  },
  {
    "IDs": "649789,649790",
    "lat": "48.096677999999997",
    "lng": "11.650854000000001",
    "titel": "\n",
    "jobs": [2592, 2593],
    "weight": 2
  },
  {
    "IDs": "648972,648511",
    "lat": "48.713151799999999",
    "lng": "9.0000947999999994",
    "titel": "\n",
    "jobs": [2619, 2620],
    "weight": 2
  },
  {
    "IDs": "648550,648551",
    "lat": "48.7623076",
    "lng": "9.2002913999999993",
    "titel": "Junior Consultant agiles Projektmanagement Automotive (m/w/d)\nJunior Consultant agiles Projektmanagement Automotive (m/w/d)",
    "jobs": [2621, 2622],
    "weight": 2
  },
  {
    "IDs": "644567",
    "lat": "50.080629999999999",
    "lng": "8.6780767999999995",
    "titel": "International Media Manager (m/w/d)",
    "jobs": [2630],
    "weight": 1
  },
  {
    "IDs": "642193,642194",
    "lat": "47.970020900000002",
    "lng": "11.776599300000001",
    "titel": "\n",
    "jobs": [2636, 2637],
    "weight": 2
  },
  {
    "IDs": "637008,637009",
    "lat": "48.743342499999997",
    "lng": "9.3201122000000005",
    "titel": "Consultant / Softwareingenieur / Softwareentwickler (m/w)\nConsultant / Softwareingenieur / Softwareentwickler (m/w)",
    "jobs": [2653, 2654],
    "weight": 2
  }
]
globalStore.dispatch("setJobLocationAll", orte)



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

//visibility trigger of the 
branchSelector?.addEventListener("click", () => {
  let div = document.getElementById("KT_1_list")
  div!.style.display = div!.style.display == "none" ? "block" : "none"
})

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

//implementieren wenn mehr Optionen gebraucht werden
// function more_options() {
//   let div = document.getElementById("more_options_div")
//   div!.style.display = div!.style.display == "none" ? "block" : "none"
// }


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