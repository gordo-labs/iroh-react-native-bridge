export type IrohBridgeConnection = {
  send(data: Uint8Array | number[]): Promise<void>;
  onMessage(handler: (data: Uint8Array) => void): () => void;
  close(): Promise<void>;
};

export type IrohBridge = {
  bridgeVersion(): string | Promise<string>;
  nodeId(): string | Promise<string>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean | Promise<boolean>;
  connect(nodeId: string, relayUrl?: string | null): Promise<IrohBridgeConnection>;
};

export declare const MODULE_NAME = "IrohBridge";
export declare function getIrohBridge(): IrohBridge | null;
export default getIrohBridge;
