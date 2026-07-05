package design.gordo.musichub.iroh

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule

class MusicHubIrohModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "MusicHubIroh"

  @ReactMethod
  fun bridgeVersion(promise: Promise) {
    promise.resolve("0.1.0-rn-shell")
  }

  @ReactMethod
  fun nodeId(promise: Promise) {
    promise.resolve("")
  }

  @ReactMethod
  fun isRunning(promise: Promise) {
    promise.resolve(false)
  }

  @ReactMethod
  fun start(promise: Promise) {
    promise.reject("iroh_not_linked", "Iroh Rust runtime is not linked into this Android build yet")
  }

  @ReactMethod
  fun stop(promise: Promise) {
    promise.resolve(null)
  }

  @ReactMethod
  fun connect(nodeId: String, relayUrl: String?, promise: Promise) {
    promise.reject("iroh_not_linked", "Iroh Rust runtime is not linked into this Android build yet")
  }

  @ReactMethod
  fun send(connectionId: String, data: ReadableArray, promise: Promise) {
    promise.reject("iroh_not_connected", "Iroh connection is not open")
  }

  @ReactMethod
  fun close(connectionId: String, promise: Promise) {
    promise.resolve(null)
  }

  @Suppress("unused")
  private fun emitMessage(connectionId: String, bytes: ByteArray) {
    val event = Arguments.createMap()
    val data = Arguments.createArray()
    bytes.forEach { byte -> data.pushInt(byte.toInt() and 0xff) }
    event.putString("connectionId", connectionId)
    event.putArray("data", data)
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("MusicHubIrohMessage", event)
  }
}
