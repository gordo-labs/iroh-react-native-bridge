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

export type IrohEndpointTicketTarget = {
  kind: "endpoint-ticket";
  /** Canonical `EndpointTicket` string produced by the official `iroh-tickets` crate. */
  ticket: string;
};

export type IrohEndpointAddressTarget = {
  kind: "endpoint-address";
  nodeId: string;
  directAddresses?: string[];
  relayUrl?: string | null;
};

export type IrohDialTarget = IrohEndpointTicketTarget | IrohEndpointAddressTarget;

export type IrohConnectTargetOptions = {
  target: IrohDialTarget;
  alpn: string;
  timeoutMs?: number;
};

export type IrohBridgeErrorCode =
  | "ALREADY_STARTED"
  | "NOT_STARTED"
  | "NOT_CONNECTED"
  | "INVALID_NODE_ID"
  | "INVALID_ADDRESS"
  | "INVALID_TICKET"
  | "INVALID_DIAL_TARGET"
  | "INVALID_FRAME"
  | "DIAL_TIMEOUT"
  | "STREAM_OPEN_TIMEOUT"
  | "BACKPRESSURE"
  | "OPERATION_FAILED"
  | "INTERNAL"
  | "UNSUPPORTED_NATIVE_API"
  | "UNKNOWN";

export declare class IrohBridgeError extends Error {
  readonly code: IrohBridgeErrorCode;
  readonly cause?: unknown;
}

export type IrohBridge = {
  bridgeVersion(): string | Promise<string>;
  nodeId(): string | Promise<string>;
  start(options?: IrohStartOptions): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean | Promise<boolean>;
  /** Opens one framed QUIC stream, reusing a warm peer session when possible. */
  connect(options: IrohConnectOptions): Promise<IrohBridgeConnection>;
  /** Opens a stream from a validated endpoint ticket or explicit endpoint address. */
  connectTarget(options: IrohConnectTargetOptions): Promise<IrohBridgeConnection>;
  /** Logical session helper for owning several independent QUIC streams. */
  openSession(options: IrohConnectOptions): Promise<IrohBridgeSession>;
  /** Logical session helper using the typed dial-target contract. */
  openTargetSession(options: IrohConnectTargetOptions): Promise<IrohBridgeSession>;
};

export declare const MODULE_NAME = "IrohBridge";
export declare function getIrohBridge(): IrohBridge;
export default getIrohBridge;
