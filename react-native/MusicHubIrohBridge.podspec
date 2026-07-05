require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'MusicHubIrohBridge'
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']
  s.author       = { 'Gordo Labs' => 'engineering@gordo.design' }
  s.homepage     = 'https://github.com/gordo-labs/iroh-react-native-bridge'
  s.source       = { :git => 'https://github.com/gordo-labs/iroh-react-native-bridge.git', :tag => s.version.to_s }
  s.platforms    = { :ios => '15.1' }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.swift_version = '5.0'
  s.dependency 'React-Core'
end
