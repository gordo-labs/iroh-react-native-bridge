export type IrohBridgeConnection = {
  send(data: Uint8Array | number[]): Promise<void>;
  onMessage(handler: (data: Uint8Array) => void): () => void;
  onClose(handler: () => void): () => void;
  onError(handler: (error: Error) => void): () => void;
  isClosed(): boolean;
  close(): Promise<void>;
};

export type IrohBridgeSession = {
  openStream(): Promise<IrohBridgeConnection>;
  isClosed(): boolean;
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
  /** Opens one framed QUIC stream, reusing a warm peer session when possible. */
  connect(options: IrohConnectOptions): Promise<IrohBridgeConnection>;
  /** Logical session helper for owning several independent QUIC streams. */
  openSession(options: IrohConnectOptions): Promise<IrohBridgeSession>;
};

export declare const MODULE_NAME = "IrohBridge";
export declare function getIrohBridge(): IrohBridge;
export default getIrohBridge;
