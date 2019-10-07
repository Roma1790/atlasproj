import { Control } from "ol/control"
import BaseLayer from "ol/layer/Base"
import VectorLayer from "ol/layer/Vector"

export declare class OLNotification extends Control {
  public show(text: string): void
}

export declare class OLControl {}
export declare class OLInteraction {}

export declare class OLMap {
  private addControl(control: OLControl | OLNotification): void
  private addInteraction(interaction: any): void
  private getView(): any
  private addLayer(layer: BaseLayer): void
  private removeLayer(layer: BaseLayer): void
  private getLayers(): { array_: BaseLayer[] }
  private getSize(): number[]
}

export declare class OLFeature {
  public get(key: string): any
}
export declare class OLStyle {}

export declare class OLVectorSource {
  private addFeatures(features: OLFeature[]): void
  private clear(): void
}

export declare class OLCluster {
  public getSource(): OLVectorSource
}

export declare class OLSelect {}

export declare class OLLayer extends VectorLayer {
  public addFilter(mask: any): void
}
