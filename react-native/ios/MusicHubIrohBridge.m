#import "MusicHubIrohBridge.h"

@implementation MusicHubIrohBridge

RCT_EXPORT_MODULE(MusicHubIroh)

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"MusicHubIrohMessage"];
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_REMAP_METHOD(bridgeVersion,
                 bridgeVersionWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@"0.1.0-rn-shell");
}

RCT_REMAP_METHOD(nodeId,
                 nodeIdWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@"");
}

RCT_REMAP_METHOD(isRunning,
                 isRunningWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@(NO));
}

RCT_REMAP_METHOD(start,
                 startWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  reject(@"iroh_not_linked", @"Iroh Rust runtime is not linked into this iOS build yet", nil);
}

RCT_REMAP_METHOD(stop,
                 stopWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(nil);
}

RCT_REMAP_METHOD(connect,
                 connectToNode:(NSString *)nodeId
                 relayUrl:(NSString *)relayUrl
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  reject(@"iroh_not_linked", @"Iroh Rust runtime is not linked into this iOS build yet", nil);
}

RCT_REMAP_METHOD(send,
                 sendToConnection:(NSString *)connectionId
                 data:(NSArray<NSNumber *> *)data
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  reject(@"iroh_not_connected", @"Iroh connection is not open", nil);
}

RCT_REMAP_METHOD(close,
                 closeConnection:(NSString *)connectionId
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(nil);
}

@end
