
import React, { Component } from 'react';
// import classNames from 'classnames'
import {
  CButton,
  CRow,
  CCol,
  CCard,
  CCardBody,
} from '@coreui/react'
import ROSLIB from 'roslib'
import SimJoystick from './SimJoystick';

class SimGamepad extends Component {

  constructor(props) {
    super(props);
    this.controllers = {};
    this.state = {
      buttons: [0,0,0,0,0,0,0,0,0],
      buttonNames: ["Color Cam", "Fisheye Cam", "Disable Cams", "Enable Joy", "Go to Dock", "Cancel Docking", "Undock", "Find yourself", "Start Vacuum"],
      axes: [0,0],
      sticks: [0],
      joyEnabled: false,
      videoId: 0,
      joyLastSeen: 0,  // If joy inactive for >this.joyTimeout ms, turn publishing off
      batteryLevel: 100,
      vacuumEnabled: false,
    };
    this.joyTimeout = 2000;
    this.pubTimerMs = 40;
    this.refreshCamTimerMs = 2000;
    this.ros = new ROSLIB.Ros();
  }

  componentDidMount() {

    // If there is an error on the backend, an 'error' emit will be emitted.
    this.ros.on('error', function (error) {
      console.log(error);
    });

    // Find out exactly when we made a connection.
    this.ros.on('connection', function () {
      console.log('Connection made!');
    });

    this.ros.on('close', function () {
      console.log('Connection closed.');
    });

    this.ros.connect(this.props.rosbridgeAddress);

    this.joy_topic = new ROSLIB.Topic({
      ros: this.ros,
      name: '/joy',
      messageType: 'sensor_msgs/Joy'
    });

    var battery_level_listener = new ROSLIB.Topic({
      ros : this.ros,
      name : '/battery_level',
      messageType : 'sensor_msgs/BatteryState'
    });

    // // // Calling a service
    // // // -----------------

    this.pippino_actuators_client = new ROSLIB.Service({
      ros : this.ros,
      name : '/pippino_control',
      serviceType: 'pippino_service_msg/srv/PippinoActuators'
    });


    battery_level_listener.subscribe(this.updateBatteryValue);

    setInterval(this.pubTimerEnd, this.pubTimerMs);
    setInterval(this.refreshCam, this.refreshCamTimerMs);

  }

  updateBatteryValue = (message) => {
    // console.log('Received message on ' + battery_level_listener.name + ': ' + message.percentage);
    this.setState({ batteryLevel: message.percentage.toFixed(0) });
  }

  componentWillUnmount () {
    this.ros.close();
  }

  enableJoy () {
    var buttonNames = this.state.buttonNames
    buttonNames[3] = "Disable Joy";
    this.setState({ joyEnabled: true, buttonNames: buttonNames})
  }

  disableJoy () {
    var buttonNames = this.state.buttonNames
    buttonNames[3] = "Enable Joy";
    this.setState({ joyEnabled: false, buttonNames: buttonNames })
  }

  disableVacuum () {
    return new Promise((resolve, reject) => {
      // console.log("calling the service");
      var request = new ROSLIB.ServiceRequest({bool_vacuum_enable: false});
      this.pippino_actuators_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for service call on pippino_actuators: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("PippinoActuators err:", err);
          reject(err);
        }
      );
    });
  }

  enableVacuum () {
    return new Promise((resolve, reject) => {
      console.log("calling the service");
      var request = new ROSLIB.ServiceRequest({bool_vacuum_enable: true});
      this.pippino_actuators_client.callService(
        request,
        response => {
          var success = response.success;
          console.log('response for service call on pippino_actuators: ' + response.success);
          resolve(success);
        },
        err => {
          console.error("PippinoActuators err:", err);
          reject(err);
        }
      );
    });
  }

  refreshCam = () => {
    this.state.videoId += 1;
    this.props.updateVideoSize(this.state.videoId);
  }

  pubTimerEnd = () => {
    this.publishJoy()
  }

  publishJoy = (force = false) => {
    if (this.state.joyEnabled || force){
      var joyMsg = new ROSLIB.Message({
        header:
        {
          // seq: 0,
          stamp: [0,0],
          frame_id: ""
        },
        axes: [],
        buttons: []
      });

      joyMsg.axes = this.state.axes;
      joyMsg.buttons = this.state.buttons.slice(0, 8);
      this.state.joyLastSeen += this.pubTimerMs;
      if(this.state.joyLastSeen<this.joyTimeout || force){
        this.joy_topic.publish(joyMsg);
      }
    }
  }

  buttonOn = (index) =>{
    this.state.joyLastSeen = 0;
    var buttonVals = this.state.buttons;
    buttonVals[index] = 1;
    if (index == 3){
      console.log("this.state.joyEnabled=" + this.state.joyEnabled);
      if (this.state.joyEnabled){
        this.joyStop();
        this.publishJoy(true);
        this.disableJoy();
      }else{
        this.enableJoy();
      }
    }else if(index == 2){
      this.joyStop();
      this.publishJoy(true);
      this.disableJoy();
    } else if (index == 0 || index == 1 || index == 4 || index == 5 || index == 6 || index == 7) {
      this.enableJoy();
      this.publishJoy(true);
    }
    else if(index == 8){
      console.log("this.state.vacuumEnabled=" + this.state.vacuumEnabled);
      if (this.state.vacuumEnabled){
        const vacuumPromise = this.disableVacuum();
        vacuumPromise.then(function(success) {
          if (success){
            console.log("its success");
            this.state.vacuumEnabled = false;
            var buttonNames = this.state.buttonNames;
            buttonNames[8] = "Stop Vacuum";
            this.setState({ buttonNames: buttonNames });
          }
        }.bind(this))
      }else{
        const vacuumPromise = this.enableVacuum();
        vacuumPromise.then(function(success) {
          if (success){
            console.log("its success");
            this.state.vacuumEnabled = true;
            var buttonNames = this.state.buttonNames;
            buttonNames[8] = "Start Vacuum";
            this.setState({ buttonNames: buttonNames });
          }
        }.bind(this))
      }


        // if (this.disableVacuum()){
        //   this.state.vacuumEnabled = false;
        //   var buttonNames = this.state.buttonNames;
        //   buttonNames[8] = "Start Vacuum";
        //   this.setState({ buttonNames: buttonNames });
//         }
//         promise.then(function (value) {
//           this.state.vacuumEnabled = true;
//           var buttonNames = this.state.buttonNames;
//           buttonNames[8] = "Stop Vacuum";
//           this.setState({ buttonNames: buttonNames });
// }
//         )

        // if (this.enableVacuum()){
            // this.state.vacuumEnabled = true;
            // var buttonNames = this.state.buttonNames;
            // buttonNames[8] = "Stop Vacuum";
            // this.setState({ buttonNames: buttonNames});
        // }
      // }
      // buttonVals[index] = this.state.vacuumEnabled;
      // this.publishJoy(true);
    }
    // this.enableJoy();
    this.setState({ buttons: buttonVals});
  }

  buttonOff = (index) =>{
    this.state.joyLastSeen = 0;
    var buttonVals = this.state.buttons;
    // if (index == 8) {
    //   this.state.vacuumButtonPushed = false;
    // }else{
    buttonVals[index] = 0;
    // }
    this.setState({ buttons: buttonVals });
    if (index == 4){
      this.publishJoy(true);
      this.disableJoy();
    }
  }

  joyStop = (index) =>{
    var axisVals =  this.state.axes;
    axisVals[2*index] = 0;
    axisVals[2*index+1] = 0;
    this.setState({ axes: axisVals });
    console.log("stopping joy");
    this.publishJoy(true);
  }

  joyMove = (x, y, index) =>{
    this.state.joyLastSeen = 0;
    var axisVals =  this.state.axes;
    axisVals[2*index+1] = y;
    if (y>0){
      axisVals[2*index] = x;
    }else{
      axisVals[2*index] = -x/1.6;
    }
    this.setState({ axes: axisVals });
  }

  render() {

    let buttons = this.state.buttons.map((item, index) => <CCol key={index} className="mb-xs-0 d-grid gap-2">
      <CButton className="button-fixed-height" block="true" color={item > 0 ? "primary" : "secondary"} onPointerDown={() => this.buttonOn(index)} onPointerUp={() => this.buttonOff(index)} >{this.state.buttonNames[index]}</CButton>
    </CCol>);

    let stickDisplays = this.state.sticks.map((item, index) => <CCol key={index} xl style={{ display: "flex", width: "80%", justifyContent: "center" }} className="mb-3 mb-xl-0">
      <SimJoystick size={80} move={(x,y) => this.joyMove(x,y, index)} stop={() => this.joyStop(index)} />
    </CCol>);

    let battery_status_col = <CCol style={{ width: "10%", display: "flex", justifyContent: "right" }}>Battery Level: {this.state.batteryLevel}%</CCol>;

    // let axisDisplays = this.state.axes.map((item, index) => <CCol key={index} col="6" sm="4" md="2" xl className="mb-3 mb-xl-0">
    //   <AxisBar value={item}/>
    // </CCol>);

    return (

      <CCard style={{ width: "100%", borderWidth: "0px"}}>
        {/* <CCardHeader>
          <strong>Controller</strong>
        </CCardHeader> */}
        <CCardBody>
          {/* <CRow className="align-items-center mt-3" >
            {axisDisplays}
          </CRow> */}
          <CRow className="align-items-center mb-3 joystick-row" style={{ width: "100%"}}>
            <CCol style={{ width: "10%", display: "flex", justifyContent: "left" }}></CCol>{stickDisplays}{battery_status_col}
          </CRow>
          <CRow className="align-items-center" md={{ cols: "auto", gutter: "auto" }} sm={{ cols: 3, gutter: 2 }} xs={{ cols: 3, gutter: 2 }}>
            {buttons}
          </CRow>
        </CCardBody>
      </CCard>

    );
  }
}

export { SimGamepad };