export interface Job {
  corp: string
  country: string
  date: string
  id: number
  lat: number
  logo: string
  lon: number
  score: number
  title: string
  type: string
  url: string
}

export interface JobState {
  allJobs: Job[]
  shownJobs: Job[]
}

export const FETCH_JOBS = "FETCH_JOBS"
export const SET_SHOWN_JOBS = "SET_SHOWN_JOBS"

export interface FetchJobsAction {
  type: typeof FETCH_JOBS
  payload: Job[]
}

export interface SetShowJobsAction {
  type: typeof SET_SHOWN_JOBS
  payload: Job[]
}

export type JobActionTypes = FetchJobsAction & SetShowJobsAction
