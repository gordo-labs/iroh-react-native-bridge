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

export type IrohTcpForwarderOptions = (IrohConnectOptions | IrohConnectTargetOptions) & {
  /** Loopback port to listen on; 0 (default) picks a free one. */
  listenPort?: number;
  /** Bytes written at the start of every forwarded stream, before any TCP data. */
  preamble?: Uint8Array;
};

export type IrohTcpForwarderStats = {
  activeConnections: number;
  totalConnections: number;
  failedStreams: number;
  bytesUp: number;
  bytesDown: number;
  /** Milliseconds during which data was arriving; bytesDown * 8 / activeDownMs = kbit/s. */
  activeDownMs: number;
};

export type IrohTcpForwarder = {
  readonly id: string;
  /** Port on 127.0.0.1 that forwards each accepted TCP connection over its own QUIC stream. */
  readonly port: number;
  stats(): IrohTcpForwarderStats;
  stop(): Promise<void>;
  isStopped(): boolean;
};

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
  /**
   * Listens on 127.0.0.1 and forwards every accepted TCP connection over its own
   * bidirectional QUIC stream on the shared peer session. Bytes never cross the JS bridge.
   */
  startTcpForwarder(options: IrohTcpForwarderOptions): Promise<IrohTcpForwarder>;
};

export declare const MODULE_NAME = "IrohBridge";
export declare function getIrohBridge(): IrohBridge;
export default getIrohBridge;
