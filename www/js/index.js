/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var ble = null;
var connectBtn = null;
var disconnectBtn = null;
var app = { 

    knownDevices: {},
    connectee: null,
    deviceHandle: null,
    characteristicRead: null,
    characteristicWrite: null,
    descriptorNotification: null,

    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);

        // Important reset BLE when page reloads/closes!
        window.hyper && window.hyper.onReload(function()
        {
            evothings.ble.stopScan();
            if (app.deviceHandle)
            {
                evothings.ble.close(app.deviceHandle);
            }
        });
    },
    command: function(input) {
        app.write('writeCharacteristic', app.deviceHandle, app.characteristicWrite, new Uint8Array([0x23, 0x4d, 0x30 + input]));
    
    },
    appConnect: function() {
        app.startScan();
        connectBtn.hide();
        disconnectBtn.show();
    },
    appDisconnnect: function() {
        disconnectBtn.hide();
        connectBtn.show();
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
       //app.receivedEvent('deviceready');
       ble = evothings.ble;
       connectBtn = $('a#connectButton');
       disconnectBtn = $('a#disconnectButton');
    },
    // Update DOM on a Received Event
    startScan: function() {
        
        console.log('Scanning...');
       evothings.ble.startScan(
            function(deviceInfo)
            {
                if (app.knownDevices[deviceInfo.address])
                {
                    return;
                }

                console.log('found device: ' + deviceInfo.name);
                app.knownDevices[deviceInfo.address] = deviceInfo;
                if (deviceInfo.name == 'nRF5x' && !app.connectee)
                {
                    console.log('Found nRF5x');
                    connectee = deviceInfo;
                    app.connect(deviceInfo.address);
                }
            },
            function(errorCode)
            {
                console.log('startScan error: ' + errorCode);
            });
    },
    write: function(writeFunc, deviceHandle, handle, value) {
        if (handle) {
            ble[writeFunc](
                deviceHandle,
                handle,
                value,
                function() {
                   console.log('success'); 
                }, 
                function(err) {
                    console.log('error: ' + err);
                });
        }
    },
    connect: function(address) {
        evothings.ble.stopScan();
        console.log('Connecting...');
        evothings.ble.connect(
            address,
            function(connectInfo)
            {
                if (connectInfo.state == 2) // Connected
                {
                    console.log('Connected');
                   
                    app.deviceHandle = connectInfo.deviceHandle;
                    app.getServices(connectInfo.deviceHandle);
                    connectBtn.hide();
                    disconnectBtn.show();

                }
               
            },
            function(errorCode)
            {
                console.log('connect error: ' + errorCode);
            });
    },
    startReading: function(deviceHandle) {
       // $('body').append('connected');
         app.write(
            'writeDescriptor',
            deviceHandle,
            app.descriptorNotification,
            new Uint8Array([1,0]));

        evothings.ble.enableNotification(
            deviceHandle,
            app.characteristicRead,
            function(data)
            {
                $('body').append(data + '<br>');
            },
            function(errorCode)
            {
                console.log('enableNotification error: ' + errorCode);
            });

    },
    getServices: function(deviceHandle) {
        console.log('Reading services...');

        evothings.ble.readAllServiceData(deviceHandle, function(services)
        {
            // Find handles for characteristics and descriptor needed.
            for (var si in services)
            {
                var service = services[si];

                for (var ci in service.characteristics)
                {
                    var characteristic = service.characteristics[ci];

                    if (characteristic.uuid == '713d0002-503e-4c75-ba94-3148f18d941e')
                    {
                        app.characteristicRead = characteristic.handle;
                    }
                    else if (characteristic.uuid == '713d0003-503e-4c75-ba94-3148f18d941e')
                    {
                        app.characteristicWrite = characteristic.handle;
                    }

                    for (var di in characteristic.descriptors)
                    {
                        var descriptor = characteristic.descriptors[di];

                        if (characteristic.uuid == '713d0002-503e-4c75-ba94-3148f18d941e' &&
                            descriptor.uuid == '00002902-0000-1000-8000-00805f9b34fb')
                        {
                            app.descriptorNotification = descriptor.handle;
                        }
                    }
                }
            }

            if (app.characteristicRead && app.characteristicWrite && app.descriptorNotification)
            {
                console.log('RX/TX services found.');
                app.startReading(deviceHandle);
            }
            else
            {
                console.log('ERROR: RX/TX services not found!');
            }
        },
        function(errorCode)
        {
            console.log('readAllServiceData error: ' + errorCode);
        });
    }
};

app.initialize();