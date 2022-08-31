import { get, MaybeElementRef } from '@vueuse/core'
import {
  createDraggableData,
  getBoundPosition,
  int,
  log,
  DraggableEvent,
  DraggableEventHandler,
  DraggableOptions,
  TransformEvent,
  UseDraggable
} from '../utils'
import useDraggableCore from './useDraggableCore'
import useState from './useState'

const useDraggable = (target: MaybeElementRef, options?: Partial<DraggableOptions>): UseDraggable => {
  const node = ref<HTMLElement | SVGElement>(),
    sharedState = useState(options),
    state = sharedState(),
    onDragStartHook = createEventHook<DraggableEvent>(),
    onDragHook = createEventHook<DraggableEvent>(),
    onDragStopHook = createEventHook<DraggableEvent>(),
    onTransformedHook = createEventHook<TransformEvent>(),
    scope = effectScope()

  scope.run(() => {
    const onDragStart: DraggableEventHandler = (e, data) => {
      log('Draggable: onDragStart: %j', data)

      const uiData = createDraggableData({
        data,
        ...state.currentPosition
      })

      const shouldUpdate = state.start?.(e, uiData)
      onDragStartHook.trigger({ event: e, data: uiData })
      if ((shouldUpdate || state.update) === false) return false

      state.dragging = true
      state.dragged = true
    }

    const onDrag: DraggableEventHandler = (e, data) => {
      if (!state.dragging) return false

      log('Draggable: onDrag: %j', data)

      const uiData = createDraggableData({
        data,
        ...state.currentPosition
      })

      const newState = {
        x: uiData.x,
        y: uiData.y
      }

      if (state.bounds) {
        const [boundX, boundY] = getBoundPosition({
          bounds: state.bounds,
          x: newState.x,
          y: newState.y,
          node: data.node
        })
        newState.x = boundX
        newState.y = boundY

        uiData.x = newState.x
        uiData.y = newState.y
        uiData.deltaX = newState.x - state.currentPosition.x
        uiData.deltaY = newState.y - state.currentPosition.y
      }

      const shouldUpdate = state.move?.(e, uiData)
      onDragHook.trigger({ event: e, data: uiData })
      if ((shouldUpdate || state.update) === false) return false

      state.currentPosition = newState
    }

    const onDragStop: DraggableEventHandler = (e, data) => {
      if (!state.dragging) return false

      const uiData = createDraggableData({
        data,
        ...state.currentPosition
      })

      const shouldUpdate = state.stop?.(e, uiData)
      onDragStopHook.trigger({ event: e, data: uiData })
      if ((shouldUpdate || state.update) === false) return false

      log('Draggable: onDragStop: %j', data)

      state.dragging = false
    }

    const classes = computed(() => ({
      [state.defaultClassName]: !state.disabled,
      [state.defaultClassNameDragging]: state.dragging,
      [state.defaultClassNameDragged]: state.dragged
    }))
    const addClasses = () =>
      Object.keys(get(classes)).forEach((cl) => {
        get(classes)[cl] ? get(node)?.classList.toggle(cl, true) : get(node)?.classList.toggle(cl, false)
      })
    watch(classes, addClasses)

    const { onDragStart: coreStart, onDrag: coreDrag, onDragStop: coreStop } = useDraggableCore(target, sharedState)
    coreDrag(({ event, data }) => onDrag(event, data))
    coreStart(({ event, data }) => onDragStart(event, data))
    coreStop(({ event, data }) => onDragStop(event, data))

    const onUpdated = () => {
      const pos = state.position
      log('Draggable: Updated %j', {
        position: state.currentPosition,
        prevPropsPosition: state.prevPropsPosition
      })
      if (pos) {
        state.currentPosition = pos
        state.prevPropsPosition = { ...pos }
      }
    }

    tryOnUnmounted(() => {
      state.dragging = false
    })

    tryOnMounted(() => {
      node.value = unrefElement(target)
      if (!node) {
        console.error('You are trying to use <Draggable> without passing a valid target reference.')
        return
      }
      let x = 0
      let y = 0
      const pos = state.position
      const defaultPos = state.defaultPosition
      const stylePos = get(node)?.style
      if (pos && typeof pos.x !== 'undefined') x = pos.x
      else if (defaultPos && typeof defaultPos.x !== 'undefined') x = defaultPos.x
      else if (stylePos && stylePos.top) x = int(stylePos.top)
      if (pos && typeof pos.y !== 'undefined') y = pos.y
      else if (defaultPos && typeof defaultPos.y !== 'undefined') y = defaultPos.y
      else if (stylePos && stylePos.left) y = int(stylePos.left)

      state.currentPosition = { x, y }
      addClasses()
      onUpdated()

      watch(
        () => state.position,
        () => {
          onUpdated()
        }
      )
    })
  })

  return {
    ...toRefs(state),
    state,
    onDragStart: onDragStartHook.on,
    onDrag: onDragHook.on,
    onDragStop: onDragStopHook.on,
    onTransformed: onTransformedHook.on
  }
}

export default useDraggable
