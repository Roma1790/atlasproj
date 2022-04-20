/* eslint-disable jest/expect-expect */
// t parameter = browser
import { Selector } from "testcafe"
fixture(`Map UI`).page("localhost:3000")
// UI - Components in Map --------------------------------
test("Map-Container exists", async (t) => {
  const mapDiv = Selector("#map-container")
  await t.expect(mapDiv.exists).ok()
})

test("Ol-viewport exists", async (t) => {
  const viewport = Selector(".ol-viewport")
  await t.expect(viewport.exists).ok()
})

test("Can click canvas", async (t) => {
  const canvas = Selector("canvas")
  await t
    .expect(canvas.exists).ok()
    .setTestSpeed(0.1).click(canvas, { offsetX: 100, offsetY: 100 })
})

test("OpenStreetMap Attribution Check", async (t) => {
  const attribution = Selector(".ol-attribution")
  await t
    .expect(attribution.exists).ok()
    .click(attribution).expect(attribution.innerText).contains("OpenStreetMap")
})

test("Zoom Buttons", async (t) => {
  const zoomIn = Selector(".ol-zoom").find(".ol-zoom-in")
  const zoomOut = Selector(".ol-zoom").find(".ol-zoom-out")
  await t
    .expect(zoomIn.exists).ok().click(zoomIn)
    .expect(zoomOut.exists).ok().click(zoomOut)
})
// UI - Components out of Map ---------------------------------
test("Check Visible and All - Jobs display", async (t)=> {
  const visibleJobs = Selector("#visibleJobsCounter")
  const allJobs = Selector("#allJobsCounter")
  await t
    .expect(visibleJobs.exists).ok()
    .expect(allJobs.exists).ok()
})

test("More Option exists", async(t) => {
  const moreoption = Selector('#more_options')
  await t.expect(moreoption.exists).ok()
})

test("Can enter a search string", async (t) => {
  const searchBar = Selector("#searchForm")
  await t
    .expect(searchBar.exists).ok()
    .click(searchBar).typeText(searchBar, "Germany")
  
})

test("Can enter a Radius", async (t) => {
  const radiusBar = Selector("#radVal")
  await t
    .expect(radiusBar.exists).ok()
    .click(radiusBar).typeText(radiusBar, "15")
  
})

test("Can enter a Keyword", async (t)=> {
  const keywordBar = Selector("#keywordVal")
  await t
    .expect(keywordBar.exists).ok()
    .click(keywordBar).typeText(keywordBar, "abcdefghijklmnop")
})

test("Check Full Search Function with Radius", async(t) => {

  const searchBar = Selector("#searchField")
  const searchSubmit = Selector("#searchSubmit")
  const radiusBar = Selector("#radVal")
  await t
    .expect(radiusBar.exists).ok()
    .click(radiusBar).typeText(radiusBar, "15")
    .expect(searchBar.exists).ok()
    .setTestSpeed(0.5).click(searchBar).typeText(searchBar, "Nürnberg")
    .expect(searchSubmit.exists).ok()
    
})
