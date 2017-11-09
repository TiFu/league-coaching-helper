"use strict"

import React from "react"
import ReactDOM from "react-dom"
import PropTypes from "prop-types"

const propTypes = {
  canvasWidth: PropTypes.number,
  canvasHeight: PropTypes.number,
  brushColor: PropTypes.string,
  lineWidth: PropTypes.number,
  canvasStyle: PropTypes.shape({
    backgroundColor: PropTypes.string,
    cursor: PropTypes.string
  }),
  onDrawingChanged: PropTypes.func,
  initialDrawing: PropTypes.string.isRequired,
  isDrawable: PropTypes.bool.isRequired,
}

const defaultProps = {
  canvasWidth: 854,
  canvasHeight: 480,
  brushColor: '#000000',
  lineWidth: 4,
  canvasStyle: {
    backgroundColor: '#FFFFFF',
    cursor: 'pointer'
  },
}

class DrawableCanvas extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      canvas: null,
      context: null,
      drawing: false,
      hasDrawing: false,
      lastX: 0,
      lastY: 0,
      history: []
    }
  }

  componentDidMount(){
    let canvas = ReactDOM.findDOMNode(this)

    canvas.width  = this.props.canvasWidth
    canvas.height = this.props.canvasHeight

    let ctx = canvas.getContext('2d')

    this.setState({
      canvas: canvas,
      context: ctx
    }, () => {
      if (this.props.initialDrawing) {
        let img = new Image;
        img.onload = () => {
          this.state.context.drawImage(img,0,0); // Or at whatever offset you like
        };
        img.src = this.props.initialDrawing;
      }
    })
  }

  componentWillReceiveProps = nextProps => {
    let { canvas } = this.state
    let { initialDrawing } = this.props

    if (
      initialDrawing !== nextProps.initialDrawing &&
      canvas.toDataURL() !== nextProps.initialDrawing &&
      canvas
    ) {
      if (!nextProps.initialDrawing) {
        this.resetCanvas()
      }
      else {
        let img = new Image;
        img.onload = () => {
          this.state.context.drawImage(img,0,0); // Or at whatever offset you like
        };
        img.src = initialDrawing;
      }
    }
  }

  componentDidUpdate(prevProps, prevState) {
    let { hasDrawing, lastX, lastY } = this.state
    if (this.state.hasDrawing &&
        (prevState.lastX !== lastX || prevState.lastY !== lastY)) {
      this.props.onDrawingChanged(this.saveDrawing())
    }
  }

  saveDrawing = () => {
    if (this.state.hasDrawing) {
      return this.state.canvas.toDataURL()
    }
    else {
      return null
    }
  }

  handleOnMouseDown = e => {
    let rect = this.state.canvas.getBoundingClientRect()
    this.state.context.beginPath()
    if(this.isMobile()){
      this.setState({
        lastX: e.targetTouches[0].pageX - rect.left,
        lastY: e.targetTouches[0].pageY - rect.top
      })
    }
    else {
      this.setState({
        lastX: e.clientX - rect.left,
        lastY: e.clientY - rect.top
      })
    }

    if (this.props.isDrawable) {
      this.setState({ drawing: true })
    }
  }

  handleOnMouseMove = e => {
    if(this.state.drawing){
      let rect = this.state.canvas.getBoundingClientRect()
      let lastX = this.state.lastX
      let lastY = this.state.lastY
      let currentX
      let currentY
      if(this.isMobile()){
        currentX =  e.targetTouches[0].pageX - rect.left
        currentY = e.targetTouches[0].pageY - rect.top
      }
      else{
        currentX = e.clientX - rect.left
        currentY = e.clientY - rect.top
      }


      this.draw(lastX, lastY, currentX, currentY)
      this.setState({
        lastX: currentX,
        lastY: currentY
      })
    }
  }

  handleOnMouseUp = () =>{
    if (this.state.drawing) {
      this.props.onMouseUp(this.saveDrawing())
    }
    this.setState({ drawing: false })
  }

  draw(lX, lY, cX, cY){
    if (!this.state.hasDrawing) {
      this.setState({hasDrawing: true})
    }
    this.state.context.strokeStyle = this.props.brushColor
    this.state.context.lineWidth = this.props.lineWidth
    this.state.context.moveTo(lX,lY)
    this.state.context.lineTo(cX,cY)
    this.state.context.stroke()
  }

  resetCanvas(){
    let width = this.state.context.canvas.width
    let height = this.state.context.canvas.height
    this.state.context.clearRect(0, 0, width, height)
  }

  getDefaultStyle(){
    return {
      cursor: "pointer",
      position: "absolute",
      zIndex: "0",
    }
  }

  canvasStyle(){
    let defaults =  this.getDefaultStyle()
    let custom = this.props.canvasStyle
    return Object.assign({}, defaults, custom)
  }

  isMobile(){
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      return true
    }
    return false
  }

  render() {
    return (
      <canvas
        style={this.canvasStyle()}
        onMouseDown={this.handleOnMouseDown} 
        onTouchStart={this.handleOnMouseDown}
        onMouseMove={this.handleOnMouseMove}
        onTouchMove={this.handleOnMouseMove}
        onMouseUp={this.handleOnMouseUp}
        onTouchEnd={this.handleOnMouseUp}
        className="drawable-canvas"
      />
    )
  }
}

DrawableCanvas.propTypes = propTypes
DrawableCanvas.defaultProps = defaultProps

export default DrawableCanvas