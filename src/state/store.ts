
import { Mutation, mutations } from "./mutations"
import Events from "./events"
import { Geometry } from "ol/geom"
import { Job, RawLocation } from "../types/customTypes"


export type State = {
  allJobs: Job[]
  visibleJobs: Job[]
  selectedJobs: Job[]
  allGeometries: Geometry[]
  selectedGeometries: Geometry[]
  jobLocationsAll: RawLocation[]
  jobLocations: RawLocation[]
  selectedLocation: RawLocation[]
  test?: string
  [key: string]: any
}

/**
 * Create a fresh state.
 * I had issues where the initialState was changed by side effects. 
 * So instead of defining this as an object, it returns a new object every time it is called.
 *
 * @returns
 */
export const initialState = (): State => {
  return {
    allJobs: [],
    visibleJobs: [],
    selectedJobs: [],
    allGeometries: [],
    selectedGeometries: [],
    jobLocations: [],
    jobLocationsAll: [],
    selectedLocation: [],
  }
}

/**
 * State manager for all map business.
 *
 * @class Store
 */
export class Store {
  private mutations: Record<string, Mutation>
  public events: Events
  private state: State

  /**
   * Creates an instance of Store.
   *
   * @param actions
   * @param mutations
   * @param [state]
   * @memberof Store
   */
  constructor( mutations: Record<string, Mutation>, state?: State) {
    this.events = new Events()
    this.mutations = mutations

    this.state = new Proxy(state || initialState(), {
      set: (state: State, key: string, value: Job[] | Geometry[] | RawLocation[]): boolean => {
        state[key] = value

        this.events.publish("STATE_CHANGE", state)
        this.events.publish("STATE_CHANGE_" + key.toUpperCase(), state)

        return true
      },
    })
  }

  /**
   * Getter method.
   *
   * @returns
   * @memberof Store
   */
  public getState(): State {
    return this.state
  }

  /**
   * Run an action to perform state change.
   *
   * Always use this if you want the state to change.
   *
   * @param  actionName
   * @param  payload
   * @returns Return whether action was performed successful or not.
   * @memberof Store
   */
  public dispatch(mutationName: string, payload: any): boolean {
    if (typeof this.mutations[mutationName] !== "function") {
      console.error(`Mutation "${mutationName}" doesn't exist`)
      return false
    }
    
    return this.mutations[mutationName](this.state, payload)
  }

  /**
   * Run a mutation against the current state.
   *
   * This function is public to work properly with custom actions but you *must never* call this yourself!
   *
   * @param  mutationName
   * @param payload
   * @returns Return whether mutation was performed successful or not.
   * @memberof Store
   */
  
}

/**
 * NewDefaultStore creates a Store instance with the default actions, mutations, initialState and all hooks.
 *
 * This is mainly used for testing.
 *
 * @returns
 */
export function newDefaultStore(): Store {
  return new Store(mutations, initialState())
}

export const globalStore = newDefaultStore()
