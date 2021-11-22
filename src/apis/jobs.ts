import { Job, RawSearch } from "../types/customTypes"

/**
 * Responsible for loading jobs from an endpoint.
 * This is just for testing.
 * In production the map will receive jobs from outside.
 *
 * @class Jobs
 */
export class Jobs {
  private url = "https://jobs.hochschuljobboerse.de/srv.php/Suche/offers"
  

  /**
   *Creates an instance of Jobs.
   *
   * @param [url]
   * @memberof Jobs
   */
  constructor(url?: string) {
    if (url) {
      this.url = url
    }
  }

  /**
   * Fetch data from API.
   * TODO: POST REQUEST HANDLING
   *
   * @private
   * @returns
   * @memberof Jobs
   */
  private async fetchRawJobs(kategorie?: number, fakultaet?: number, branche?: number[], postreq?: boolean): Promise<RawSearch> {
    if(postreq == true){
      // Body anpassen. 
      const body = {
        Jobtyp_ID: kategorie,
        FB_ID: fakultaet,
        KT_1: branche
      }
      const options = {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          'Content-type': 'application/json'
        }
      }
      return fetch(this.url,options).then((response) => {
        if (!response.ok) {
          console.error(`Could not fetch jobs from ${this.url}, response was: `, response)
        }
        return response.json()
      })
    }

    return fetch(this.url).then((response) => {
      if (!response.ok) {
        console.error(`Could not fetch jobs from ${this.url}, response was: `, response)
      }
      return response.json()
    })
  }

  /**
   * Clean the jobs and transform into a useful format.
   * This is only necessary because we are still loading from the old google optimized job API.
   *
   * @private
   * @param  rawSearch
   * @returns
   * @memberof Jobs
   */
  private transform(rawSearch: RawSearch): Job[] {
    return rawSearch.jobs.map((rawJob) => {
      return {
        corp: rawJob.firma,
        locations: [
          {
            /*
             parseFloat seems to result in the same value but the jobs won't get displayed.
             so I am using Number() here
            */
            lon: Number(rawJob.lng),
            lat: Number(rawJob.lat),
          },
        ],
        date: rawJob.datum,
        id: parseInt(rawJob.ID),
        logo: rawJob.logo,
        // TODO a score must be added
        score: Math.random(),
        title: rawJob.titel,
        type: rawJob.typ,
        url: rawJob.url,
      }
    })
  }

  /**
   * Public get or post method. 
   * TODO: Anpassen an Kriterien
   *
   *
   * @returns
   * @memberof Jobs
   */
  public async get(kategorie?: number, fakultaet?: number, branche?: number[], postreq?: boolean): Promise<Job[]> {
    const rawJobs = await this.fetchRawJobs(kategorie, fakultaet, branche, postreq)
    return this.transform(rawJobs)
  }
}
