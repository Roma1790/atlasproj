import { Location, SingleLocation } from "../types/customTypes"
import { Extent } from "ol/extent"
import { transformExtent } from "ol/proj"

/**
 * Remove an item from a list.
 *
 * @param list - A list of items.
 * @param entry - A single item.
 * @returns List without entry.
 */
export function removeFrom(list: any[], entry: any): any[] {
  return list.filter((value) => {
    return value !== entry
  })
}

/**
 * Remove every item in list1 from list2.
 *
 * @param list1 - A subset of list2.
 * @param list2 - A list of items.
 * @returns List2 without all items present in list1.
 */
export function removeListFromList(list1: any[], list2: any[]): any[] {
  const unique = [...new Set(list1)]
  return list2.filter((value) => {
    return !unique.includes(value)
  })
}

/**
 * Return value if it is between lower and upper, otherwise return the boundary value.
 *
 * @param  lower - The lower end of the boundary.
 * @param  value - Any value.
 * @param  upper - The upper end of the boundary.
 * @returns A number that is within lower and upper.
 */
export function bound(lower: number, value: number, upper: number): number {
  return Math.max(lower, Math.min(value, upper))
}

/**
 * Removes all duplicates from an array.
 *
 * @param list - An array with duplicates.
 * @returns A filtered array where all items are unique.
 */
export function unique(list: any[]): any[] {
  const result = []
  const map = new Map()
  for (const item of list) {
    const json = JSON.stringify(item)
    if (!map.has(json)) {
      map.set(json, true)
      result.push(item)
    }
  }
  return result
}

/**
 * Transforms a bounding box to an Extent in EPSG:3875 format.
 *
 * @param bbox - A bounding box of a feature, layer or anything else.
 * @returns An Extent in EPSG-3875 format.
 */
export function bboxToExtent(bbox: [number, number, number, number]): Extent {
  return transformExtent(bbox, "EPSG:4326", "EPSG:3857")
}

/**
 * Typeguard for SingleLocation.
 *
 * @param location - A location object that is either a SingleLocation or an Area.
 * @returns True if location is a SingleLocation.
 */
export function isSingleLocation(location: Location): location is SingleLocation {
  return (
    location !== undefined &&
    (location as SingleLocation).lat !== undefined &&
    (location as SingleLocation).lon !== undefined
  )
}
/**
 * Calcualte the carthesian product of n vectors.
 *
 * @param array - The vectors you want to multiply.
 * @returns Carthesian product of all vectors.
 */
export function carthesianProduct(array: any[][]): any[][] {
  let results = [[]]
  for (let i = 0; i < array.length; i++) {
    const currentSubArray = array[i]
    const temp = []
    for (let j = 0; j < results.length; j++) {
      for (let k = 0; k < currentSubArray.length; k++) {
        temp.push(results[j].concat(currentSubArray[k]))
      }
    }
    results = temp
  }
  return results
}
/**
 * Helper Function to check if array contains content.
 * @param array 
 * @returns Value if given array has any content.
 */
export function arrayContainsContent(array: Array<any>): boolean{
  for(var counter:number = 0; counter<array.length; counter++){
    if(array[counter] !== (null || undefined) ){
      return true;
    }
  }
  return false;
}
/**
 * Converts Latitude and Longitude into Meter - Coordinates.
   *  See https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames for more details.
   * @param lon  longitude
   * @param lat latitude
   * @returns returns coordinates in meters
   */
 export function degrees2meters (lon: number,lat:number) {
  var x = lon * 20037508.34 / 180;
  var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  return [x, y]
}
export function meters2degrees(coord: number[]) {
    
  const e_value = 2.7182818284;
  const X = 20037508.34;
  
  const lat3857 = coord[1]
  const long3857 = coord[0]
  
  //converting the longitute from epsg 3857 to 4326
  const long4326 = (long3857*180)/X;
  
  //converting the latitude from epsg 3857 to 4326 split in multiple lines for readability        
  let lat4326 = lat3857/(X / 180);
  const exponent = (Math.PI / 180) * lat4326;
  
  lat4326 = Math.atan(Math.pow(e_value, exponent));
  lat4326 = lat4326 / (Math.PI / 360); // Here is the fixed line
  lat4326 = lat4326 - 90;

  return [long4326,lat4326];
  
}


