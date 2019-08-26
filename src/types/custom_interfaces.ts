import { Elements, Job, Location } from "./custom_types"
import {
  OLCluster,
  OLFeature,
  OLLayer,
  OLMap,
  OLNotification,
  OLSelect,
} from "./ol_types"
import { OLEXTAnimatedCluster } from "./ol-ext_types"

export declare interface Map {
  mapID: string
  ui: UserInterface
  jobs: Job[]
  olmap: OLMap
  select: OLSelect
  notification: OLNotification

  zoomToLayer(layer: OLLayer): void
  featureLayerFromGeoJson(geojson: any): void
}

export declare interface UserInterface {
  map: Map
  wantedElements: string[]
  elements: Elements

  loadElements(wantedElements: string[]): Elements
  updateUI(element: string, inner: string): void
  updateCorporations(count: number): void
  updateAllJobs(count: number): void
  updateActiveJobs(count: number): void
  updateFromLocations(locations: Location[]): void
}

export declare interface Sample {
  jobs(): Promise<Job[]>
}

export declare interface ClusterLayer {
  addLocations(locations: Location[], draw?: boolean): void
  drawLocations(): void
  displayedLocations: Location[]
  distance: number
  clusterSource: OLCluster
  animatedCluster: OLEXTAnimatedCluster
}
