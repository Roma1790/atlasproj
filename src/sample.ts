// @flow

import axios from "axios"

import { log } from "./logger"

/**
 * Random sample generator
 *
 * Use this if you need testing data.
 */
export default class Sample {
  /**
   * @description
   * @param {number} count
   * @returns {Promise<IJob[]>}
   * @memberof Sample
   */
  jobs(count: number): Promise<IJob[]> {
    const startTime = new Date()
    return axios
      .get("../data/cities.json")
      .then(response => response.data)
      .then(cities => {
        const jobs = []
        while (jobs.length < count && cities.length > 0) {
          const i = Math.floor(Math.random() * cities.length)
          const city = cities.splice(i, 1)[0]
          jobs.push({
            id: i,
            corp: this.generateString(count / 4500),
            date: "",
            lat: Number(city.lat),
            lon: Number(city.lon),
            logo: "",
            score: Math.random(),
            title: "",
            type: "",
            url: "fake.domain.com",
          })
        }
        log.info(
          `Generating ${jobs.length} jobs took ${new Date() - startTime} ms.`,
        )
        return jobs
      })
  }

  /**
   * @description Generate a random string.
   * @param {number} [length=4]
   * @returns
   * @memberof Sample
   */
  generateString(length: number = 4) {
    let result = ""
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}
