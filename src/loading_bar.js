import React from 'react'
import {
  bool,
  number,
  object,
  string,
} from 'prop-types'
import { connect } from 'react-redux'

export const UPDATE_TIME = 200
export const MAX_PROGRESS = 99
export const PROGRESS_INCREASE = 10
export const ANIMATION_TIME = UPDATE_TIME * 4

const initialState = {
  endingAnimationTimeout: null,
  percent: 0,
  progressInterval: null,
}

export class LoadingBar extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      ...initialState,
      hasMounted: false,
    }

    this.boundSimulateProgress = this.simulateProgress.bind(this)
    this.boundResetProgress = this.resetProgress.bind(this)
  }

  componentDidMount() {
    // Re-render the component after mount to fix problems with SSR and CSP.
    //
    // Apps that use Server Side Rendering and has Content Security Policy
    // for style that doesn't allow inline styles should render an empty div
    // and replace it with the actual Loading Bar after mount
    // See: https://github.com/mironov/react-redux-loading-bar/issues/39
    //
    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({ hasMounted: true })

    if (this.props.loading > 0) {
      this.launch()
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.shouldStart(nextProps)) {
      this.launch()
    } else if (this.shouldStop(nextProps)) {
      if (this.state.percent === 0 && !this.props.showFastActions) {
        // not even shown yet because the action finished quickly after start
        clearInterval(this.state.progressInterval)
        this.resetProgress()
      } else {
        // should progress to 100 percent
        this.setState({ percent: 100 })
      }
    }
  }

  componentWillUnmount() {
    clearInterval(this.state.progressInterval)
    clearTimeout(this.state.endingAnimationTimeout)
  }

  shouldStart(nextProps) {
    return this.props.loading === 0 && nextProps.loading > 0
  }

  shouldStop(nextProps) {
    return this.state.progressInterval && nextProps.loading === 0
  }

  shouldShow() {
    return this.state.percent > 0 && this.state.percent <= 100
  }

  launch() {
    let { progressInterval, percent } = this.state
    const { endingAnimationTimeout } = this.state

    const loadingBarNotShown = !progressInterval
    const endingAnimationGoing = percent === 100

    if (loadingBarNotShown) {
      progressInterval = setInterval(
        this.boundSimulateProgress,
        this.props.updateTime,
      )
    }

    if (endingAnimationGoing) {
      clearTimeout(endingAnimationTimeout)
    }

    percent = 0

    this.setState({ progressInterval, percent })
  }

  newPercent() {
    const { percent } = this.state
    const { progressIncrease } = this.props

    // Use cos as a smoothing function
    // Can be any function to slow down progress near the 100%
    const smoothedProgressIncrease = (
      progressIncrease * Math.cos(percent * (Math.PI / 2 / 100))
    )

    return percent + smoothedProgressIncrease
  }

  simulateProgress() {
    let { progressInterval, percent, endingAnimationTimeout } = this.state
    const { maxProgress } = this.props

    if (percent === 100) {
      clearInterval(progressInterval)
      endingAnimationTimeout = setTimeout(
        this.boundResetProgress,
        ANIMATION_TIME,
      )
      progressInterval = null
    } else if (this.newPercent() <= maxProgress) {
      percent = this.newPercent()
    }

    this.setState({ percent, progressInterval, endingAnimationTimeout })
  }

  resetProgress() {
    this.setState(initialState)
  }

  buildStyle() {
    const style = {
      opacity: '1',
      transform: `scaleX(${this.state.percent / 100})`,
      transformOrigin: 'left',
      transition: `transform ${ANIMATION_TIME}ms linear`,
      width: '100%',
      willChange: 'transform, opacity',
    }

    // Use default styling if there's no CSS class applied
    if (!this.props.className) {
      style.height = '3px'
      style.backgroundColor = 'red'
      style.position = 'absolute'
    }

    if (this.shouldShow()) {
      style.opacity = '1'
    } else {
      style.opacity = '0'
    }

    return { ...style, ...this.props.style }
  }

  render() {
    // In order not to violate strict style CSP it's better to make
    // an extra re-render after component mount
    if (!this.state.hasMounted) {
      return <div />
    }

    return (
      <div>
        <div style={this.buildStyle()} className={this.props.className} />
        <div style={{ display: 'table', clear: 'both' }} />
      </div>
    )
  }
}

LoadingBar.propTypes = {
  className: string,
  loading: number,
  maxProgress: number,
  progressIncrease: number,
  showFastActions: bool,
  // eslint-disable-next-line react/forbid-prop-types
  style: object,
  updateTime: number,
}

LoadingBar.defaultProps = {
  className: undefined,
  loading: 0,
  maxProgress: MAX_PROGRESS,
  progressIncrease: PROGRESS_INCREASE,
  showFastActions: false,
  style: {},
  updateTime: UPDATE_TIME,
}

const mapStateToProps = state => ({
  loading: state.loadingBar,
})

export default connect(mapStateToProps)(LoadingBar)
