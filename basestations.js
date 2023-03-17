var lighthouses = {};
/*
{
    name: "HTC BS XYXYXY",
    browser_id: "AAAAAAAAAAAAAAA=",
    bt_device: [BluetoothDevice],
    laststate_raw: [Uint8Array]
}
*/

function i2hex(i) {
    return ('0' + i.toString(16)).slice(-2);
}

function RefreshLighthouseTable() {
    const deviceTable = document.getElementById("device_table");

    // clear all child elements
    while (deviceTable.firstChild)
        deviceTable.removeChild(deviceTable.lastChild);

    // add header
    const header_row = deviceTable.insertRow();
    const name_title = document.createElement('th');
    name_title.appendChild(document.createTextNode("Device Name"));
    header_row.appendChild(name_title);
    const status_title = document.createElement('th');
    status_title.appendChild(document.createTextNode("Status*"));
    header_row.appendChild(status_title);
    const controls_title = document.createElement('th');
    controls_title.appendChild(document.createTextNode("Controls"));
    header_row.appendChild(controls_title);

    // add each device
    Object.values(lighthouses).forEach((device) => {
        let row = deviceTable.insertRow();
        // name
        let name_col = row.insertCell();
        name_col.appendChild(document.createTextNode(device.name));
        // status
        let status_col = row.insertCell();
        let status_string = 'Unknown';
        if (device.laststate_raw != null) {
            if (device.laststate_raw.getUint8(3) == 0x3c)
                status_string = 'Standby';
            else
                status_string = 'Active';
        }
        status_col.appendChild(document.createTextNode(status_string));
        // controls
        let controls_col = row.insertCell();
        let on_btn = document.createElement('button');
        on_btn.onclick = () => { SendHTCBSCommand(device, 0x00, 0x0000) };
        on_btn.appendChild(document.createTextNode("On"));
        controls_col.appendChild(on_btn);
        let standby_btn = document.createElement('button');
        standby_btn.onclick = () => { SendHTCBSCommand(device, 0x01, 0x0004) };
        standby_btn.appendChild(document.createTextNode("Standby"));
        controls_col.appendChild(standby_btn);
    });
}

function RegisterBTDevice(device) {
    console.log(`discovered ${device.name}`);
    // if we have the device then don't care, re-poll though
    if (device.name in lighthouses) {
        PollHTCBSState(lighthouses[device.name]);
        return;
    }
    // otherwise add
    lighthouses[device.name] = {
        name: device.name,
        browser_id: device.id,
        bt_device: device,
        laststate_raw: null
    }
    // then poll the state
    PollHTCBSState(lighthouses[device.name]);
}

function Swap16BE(i) {
	return ((i >> 8) | (i << 8)) & 0xFFFF;
}

function BuildHTCBSCommand(cmd, val) {
    let buf = new Uint8Array(20);
    buf[0] = 0x12;
    buf[1] = cmd;
    buf[2] = (val >> 8) & 0xFF;
    buf[3] = val & 0xFF;
    for (var i = 4; i < 8; i++)
        buf[i] = 0xFF; // no idea what this is? might be based on MAC address
    return buf;
}

function RefreshAll() {
    Object.values(lighthouses).forEach(PollHTCBSState);
}

function PollHTCBSState(device) {
    if (device.bt_device.gatt.connected != true) {
        // if we aren't connected to the device GATT server, connect then try again
        device.bt_device.gatt.connect().then(() => { PollHTCBSState(device) });
        return;
    }
    // connect to the vive service and read the value from the characteristic
    device.bt_device.gatt.getPrimaryService(0xCB00).then(service => {
        return service.getCharacteristic(0xCB01);
    }).then(characteristic => {
        return characteristic.readValue();
    }).then(state_value => {
        device.laststate_raw = state_value;
        console.log(`fetched state for ${device.name}`);
        console.log(device.laststate_raw);
        RefreshLighthouseTable();
    });
}

function SendHTCBSCommand(device, cmd, val) {
    if (device.bt_device.gatt.connected != true) {
        // if we aren't connected to the device GATT server, connect then try again
        device.bt_device.gatt.connect().then(() => { SendHTCBSCommand(device, cmd, val) });
        return;
    }
    // connect to the vive service and write the command to the characteristic
    device.bt_device.gatt.getPrimaryService(0xCB00).then(service => {
        return service.getCharacteristic(0xCB01);
    }).then(characteristic => {
        // we do writeValueWithResponse, but we don't *actually* want a response
        return characteristic.writeValueWithResponse(BuildHTCBSCommand(cmd, val));
    }).then(val => {
        // give a bit of a timeout then poll for new state
        setTimeout(() => { PollHTCBSState(device) }, 2000);
    });
}

function RequestAdd() {
    navigator.bluetooth.requestDevice({
        filters: [
            { services: [ 0xCB00 ] }, // HTC Vive Base Stations (1.0)
            //{ services: [ "00001523-1212-efde-1523-785feabcd124" ] }  // Valve Index Base Stations (2.0) - these are totally different
        ]
    }).then(RegisterBTDevice);
}

function LoadDevices() {
    navigator.bluetooth.getDevices().then(devices => {
        devices.forEach(RegisterBTDevice);
    });
}
