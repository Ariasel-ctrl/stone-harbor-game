const React = require('react')
const ReactCSSTransitionGroup = require('react-addons-css-transition-group')
import { showNextSection, showNextChapter, updateInventory, setExpansions, updateStateCounter } from "../actions"
import { inverter } from '../lib'
import { connect } from 'react-redux'

/* A nextChapter link */
export const NextChapter = ({chapter}) => (
  <div className="next-chapter-link"><List expansions={["Continue", ""]} tag={"c" + chapter + "next"} nextUnit="chapter"/></div>
)

/* A Link that the user interacts with to potentially change state */
export const Link = ({text, handler}) => {
  if (handler)
    return <a href="#" onClick={handler} dangerouslySetInnerHTML={{__html: text}}/>
  return <span dangerouslySetInnerHTML={{__html: text}}/>
}

function _fromInventory(inventory, offset="last") {
  let inv = inventory ? inventory.split(" ") : ""
  let out = offset === "last" ? inv[inv.length - 1] : inv[offset]
  return out
}

/* Return a word from an inventory list. By default, returns the last word. Otherwise,
return the offset word */
export const FromInventory = ({inventory, offset="last"}) => (
  <span key={inventory} dangerouslySetInnerHTML={{__html: _fromInventory(inventory, offset)}} />
)

/* For a given value of an inventory property, return the value from the `from`
map that matches. Accepts an optional `offset` which is passed through to `fromInventory`.
If the map evaluates to string, return wrapped HTML;
if the map evaluates to a function, call it;
otherwise return the node.
 */
export const Map = ({from, to, offset="last"}) => {
  var _from = _fromInventory(from, offset)
  if (!to[_from] || typeof to[_from] === 'string')
    return <span key={to[_from]} dangerouslySetInnerHTML={{__html: to[_from]}} />
  else if (typeof to[_from] == 'function')
    return to[_from]()
  return to[_from]
}
Map.propTypes = {
  from: React.PropTypes.string,
  to: React.PropTypes.object.isRequired,
  offset: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.number])
}

/* Given an inventory _array_, where the value in inventory is an array which
   may contain 0, 1, or many items, return matching values from the
   `to` object */
export const ManyMap = ({from, to}) => {
  if (!from)
    return null
  let matches = from.filter((item) => Object.keys(to).indexOf(item) != -1)
  return <span>
    {[...matches].map((item, i) => <span key={i}>{to[item]}</span>)}
  </span>
}
ManyMap.propTypes = {
  from: React.PropTypes.array,
  to: React.PropTypes.object.isRequired
}

/* Given an inventory _array_, where the value in inventory is an array which
   may contain 0, 1, or many items, return a random matching value that
   matches from the `to` object. Items in the array will only be considered if
   they are greater than or equal to `indexStart`, which defaults to 0 */
export const AnyMap = ({from, to, indexStart=0}) => {
  if (!from) {
    if (to[undefined]) {
      return to[undefined]
    }
    return null
  }
  let matches = from.filter((item, index) =>
    Object.keys(to).indexOf(item) != -1 && index <= indexStart)

  return <span>
    {to[matches[Math.floor(Math.random() * matches.length)]]}
  </span>
}
AnyMap.propTypes = {
  from: React.PropTypes.array,
  to: React.PropTypes.object.isRequired,
  indexStart: React.PropTypes.number
}

// Display all items in an expansion _except_ the user's selection.
// If `offset` is not null, calls _fromInventory with that offset
// value to truncate each item; otherwise displays the item in full
export const AllButSelection = ({selection, expansions, offset=null}) => {
  let notSelected = inverter(selection, expansions)
  let notSelectedDisplay = []
  for (var item of notSelected) {
    if (offset) {
      notSelectedDisplay.push(_fromInventory(item, offset))
    }
    else {
      notSelectedDisplay.push(item)
    }
  }
  return iteratedList(notSelectedDisplay)
}
// For a list of items, return a JSX node of markup
const iteratedList = (items) => (
  <span>{
    [...items].map((t, i) =>
      <span key={i}>
        { i == items.length -1 ? "and ": "" }
        { t }
        { i < items.length -1 ? ", ": "" }
      </span>
  )}
  </span>
)

/* An array of expansions that can be "examined." Accepts an array and
reveals items one-by-one. Arrays may be nested one-level deep; if the current
item is an array, each value will be displayed separated by commas and ending
with "and". When only one item remains, nextUnit is fired (which may be null)
in which case no event is triggered.

Each time an expansion is revealed, onSetExpansions is called and onUpdateInventory
sets the inventory property `key` to the current selected value. */

class _List extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this)
    this.state = {
      currentExpansion: this.props.currentExpansion,
    }
  }
  componentWillMount() {
    this.props.onSetExpansions(this.props.expansions, this.props.tag, this.props.currentExpansion)
    this.props.onUpdateInventory(undefined, this.props.tag)
  }
  componentWillReceiveProps(newProps) {
    if (newProps.currentExpansion != this.state.currentExpansion)  {
      this.setState({currentExpansion: newProps.currentExpansion})
    }
  }
  handleChange(e) {
    e.preventDefault()
    var currentExpansion = this.state.currentExpansion + 1
    this.props.onSetExpansions(this.props.expansions, this.props.tag, currentExpansion)
    this.props.onUpdateInventory(e.target.textContent, this.props.tag)

    // Are we at the last set? If so, there may be some events to fire
    if (currentExpansion === this.props.expansions.length - 1) {

      if (this.props.nextUnit === "chapter") {
        this.props.onCompleteChapter()
      }
      else if (this.props.nextUnit === "section") {
        this.props.onCompleteSection()
      }
      // The no-op version just expands in place (usually because another selector)
      // will do the expansion
      else if (this.props.nextUnit === "none")  {
        // no-op
      }
    }
    // Tick the clock
    this.props.onUpdateCounter()

    this.setState({
      currentExpansion: currentExpansion,
    })
  }
  render () {
    let text = this.props.expansions[this.state.currentExpansion]
    let handler = this.state.currentExpansion < this.props.expansions.length - 1 ? this.handleChange : null
    if (typeof(text) === "string") {
      return <Link handler={handler} text={text}/>
    }
    else {
      return <span>{
        [...text].map((t, i) =>
          <span key={t}>
            { i == text.length -1 ? ` ${this.props.conjunction} `: "" }
            <Link handler={handler} text={t}/>
            { text.length > 2 && i < text.length -1 ? ", ": "" }
          </span>
      )}</span>
    }
  }
}
_List.propTypes = {
  nextUnit: React.PropTypes.oneOf(['chapter', 'section', 'none']),
  tag: React.PropTypes.string.isRequired,
  expansions: React.PropTypes.array.isRequired,
  currentExpansion: React.PropTypes.number,
  conjunction: React.PropTypes.string
}
_List.defaultProps = {
  nextUnit: 'section',
  conjunction: "and"
}

const mapDispatchToProps = (dispatch) => {
    return {
      // Set the expansion list for a given tag and return the expansion object
      onSetExpansions: (expansions, tag, currentExpansion) => {
        var exp = {}
        exp[tag] = {currentExpansion: currentExpansion, expansions: expansions}
        dispatch(setExpansions(exp))
      },
      // Set the inventory object and return the changed inventory
      onUpdateInventory: (sel, tag) => {
        dispatch(updateInventory(sel, tag))
      },
      onCompleteSection: () => {
        dispatch(showNextSection())
      },
      onCompleteChapter: () => {
        dispatch(showNextChapter())
      },
      onUpdateCounter: () => {
        // Force unlocking the history before dispatching
        window.lockHistory = false
        dispatch(updateStateCounter())
      }
    }
}

const mapStateToProps = (state, ownProps, currentExpansion=0) => {
  if (state.expansions.hasOwnProperty(ownProps.tag)) {
    currentExpansion = state.expansions[ownProps.tag].currentExpansion
  }
  return {
    currentExpansion: currentExpansion,
  }
}
export const List = connect(
  mapStateToProps,
  mapDispatchToProps
)(_List)
