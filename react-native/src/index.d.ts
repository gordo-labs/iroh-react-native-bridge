export type IrohBridgeConnection = {
  send(data: Uint8Array | number[]): Promise<void>;
  onMessage(handler: (data: Uint8Array) => void): () => void;
  close(): Promise<void>;
};

export type IrohStartOptions = {
  alpns?: string[];
};

export type IrohConnectOptions = {
  nodeId: string;
  alpn: string;
  addressHint?: string | null;
  timeoutMs?: number;
};

export type IrohBridge = {
  bridgeVersion(): string | Promise<string>;
  nodeId(): string | Promise<string>;
  start(options?: IrohStartOptions): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean | Promise<boolean>;
  connect(options: IrohConnectOptions): Promise<IrohBridgeConnection>;
};

export declare const MODULE_NAME = "IrohBridge";
export declare function getIrohBridge(): IrohBridge | null;
export default getIrohBridge;
