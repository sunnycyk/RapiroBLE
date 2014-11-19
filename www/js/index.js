/*
 * Sunny Cheung
 * http://sunnycyk.com 
 *
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

// UI instance
var connectBtn = null;
var disconnectBtn = null;
var deviceList = null;

// Start the app when device is ready
document.addEventListener('deviceready', function() { app.initialize(); }, false);

var app = {};

// Define Service and Charateristic UUID
app.RBL_SERVICE_UUID = '713d0000-503e-4c75-ba94-3148f18d941e';
app.RBL_CHAR_TX_UUID = '713d0002-503e-4c75-ba94-3148f18d941e';
app.RBL_CHAR_RX_UUID = '713d0003-503e-4c75-ba94-3148f18d941e';
app.RBL_TX_UUID_DESCRIPTOR = '00002902-0000-1000-8000-00805f9b34fb';


app.initialize = function() {
    app.connected = false;

    connectBtn = $('a#connectButton');
    disconnectBtn = $('a#disconnectButton');
    deviceList = $('ul#bleList');
  
};

// look for BLE device
app.startScan = function() {
    app.disconnect();
    console.log('Scanning');
    app.devices = {};

    easyble.startScan(function(device) {
        app.devices[device.address] = device;
        deviceList.append('<li><a href="#" onclick="app.connect(\'' + device.address + '\')">' + 
                            device.name + '</a></li>').listview('refresh');
    }, function(errorCode) {
        navigator.notification.alert('Error: ' + errorCode, function() {});
        console.log('Error ' + errorCode);
    });
};

// Connect to the selected BLE device
app.connect = function(address) {
    var device = app.devices[address];
    // stop scan;
    easyble.stopScan();
 
    device.connect(function(device) { // success
        $.mobile.loading('show', {});    
        device.readServices([app.RBL_SERVICE_UUID], function(device) {
            app.connected = true;
            app.device = device;

            console.log('Connected to ' + device.name);

            device.writeDescriptor(
                app.RBL_CHAR_TX_UUID,
                app.RBL_TX_UUID_DESCRIPTOR,
                new Uint8Array([1,0]),
                function() {
                    console.log('Status: writeDescriptor ok.');
                },
                function(errorCode) {
                    navigator.notification.alert('Error: writeDescriptor: ' + errorCode, function() {});
                    console.log('Error: writeDescriptor: ' + errorCode + '.');
                });

            device.enableNotification(app.RBL_CHAR_TX_UUID, app.receivedData, function(errorCode) {
                navigator.notification.alert('BLE enableNotification error: ' + errorCode, function() {});
                console.log('BLE enableNotification error: ' + errorCode); 
            });

            $.mobile.loading('hide');
            $.mobile.changePage('#control');
            connectBtn.hide();
            disconnectBtn.show();
        },
        function(errorCode) {
            $.mobile.loading('hide'); 
            app.disconnect();
            navigator.notification.alert('Error reading services: ' + errorCode, function() {});
            console.log('Error reading services '  + errorCode);
        });
    }, function(errorCode) {
        app.disconnect();
        console.log('Error ' + errorCode);
    });
};

// Send Data
app.sendData = function(data) {
    if (app.connected) {
        data = new Uint8Array(data);
        app.device.writeCharacteristic(app.RBL_CHAR_RX_UUID, data, function() {
            console.log('Succeded to send message.');
        }, function(errorCode) {
            navigator.notification.alert('Failed to send data: ' + errorCode, function() {});
            console.log('Failed to send data with error: ' + errorCode);
            app.disconnect();
        });
    }
    else {
        console.log('Error - No device connected');
    }
};

// Handle received Data
app.receivedData = function(data) {
    var data = new Uint8Array(data);

    console.log('Data received: ' + data);
}

// Disconnect BLE
app.disconnect = function() {

    app.connected = false;
    app.device = null;

    easyble.stopScan();
    easyble.closeConnectedDevices();
    console.log('Disconnected');

    connectBtn.show();
    disconnectBtn.hide();
    deviceList.empty();
};


// Rapiro command
app.command = function(cmd) {
   app.sendData([0x23, 0x4d, 0x30 + cmd]);
};
