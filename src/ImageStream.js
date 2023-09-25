
import React, { Component } from 'react';
import {
  CCard,
  CCardHeader,
  CCardBody
} from '@coreui/react'




class ImageStream extends Component {

    constructor(props) {
        super(props);
      }


  render() {

    return (

      <CCard style={{ width: "100%", borderWidth: "0px" }}>
      {/* <CCardHeader>
        <strong>Image Stream</strong>
      </CCardHeader> */}
      <CCardBody style={{ padding: "0px", maxHeight: "84vh", overflow: "clip" }}>
          <img src={`${this.props.src}&type=${this.props.type}&${this.props.id}`} style={{width: "100%", height: "100%", objectFit: "contain"}}></img>
          {/* <img src={`${this.props.src}&${this.props.type}&${this.props.id}`} style={{width: "100%", height: "100%", objectFit: "contain"}}></img> */}
      </CCardBody>
    </CCard>

    );
  }
}

export { ImageStream };