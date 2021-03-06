import { pick } from 'lodash'
import React, { useState } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import ReactDOM from 'react-dom'
import { Trash2, XCircle } from 'react-feather'
import { Button, Card, CardBody, CardText, CardTitle, Col, Form, FormGroup, Row, Spinner } from 'reactstrap'
import { mutate } from 'swr'
import { useUser } from '../../../utils/auth/useUser'
import { cy2rg, getDependents, removePopper, setPopper } from '../../../utils/cyHelpers'
import { fetcher } from '../../../utils/fetchWrapper'
import CloseButton from '../CloseButton'

export default function del(menu, poppers, setEls) {
  const del = document.createElement('span')
  ReactDOM.render(<Trash2/>, del)
  menu.push({
    fillColor: 'rgba(200, 0, 0, 0.75)',
    content: del.outerHTML,
    contentStyle: {},
    select: function (el) {
      setPopper(
        el.id(),
        el.popper({
          content: () => {
            const popperCard = document.createElement('div')
            ReactDOM.render(<PopperCard el={el} poppers={poppers} setEls={setEls}/>, popperCard)

            document.body.appendChild(popperCard)
            popperCard.setAttribute('id', `popper-${el.id()}`)

            return popperCard
          }
        }),
        poppers
      )
    },
    enabled: true
  })
}

const PopperCard = ({ el, poppers, setEls }) => {
  const data = el.data()
  const { user } = useUser()
  const [spinnerDisplay, setSpinnerDisplay] = useState('d-none')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const rootId = el.cy().nodes().id()
    setSpinnerDisplay('d-block')

    const coll = getDependents(el)
    const data = cy2rg(coll.map(el => pick(el.data(), 'id', '_rev', '_key')))
    const { data: result, ok } = await fetcher('/api/nodes', user.token, 'DELETE', JSON.stringify(data))
      .then(({ data, ok, status }) => {
        if (ok) {
          const key = rootId.split('/')[1]

          return fetcher(`/api/mindmaps/${key}`, user.token)
        }

        return { data, ok, status }
      })
    const options = {
      place: 'tr',
      autoDismiss: 7
    }

    if (ok) {
      const { elements } = result
      setEls(CytoscapeComponent.normalizeElements(elements))
      mutate([`/api/${rootId}/timeline`, user.token])

      options.message = 'Deleted node(s)!'
      options.type = 'success'
    }
    else {
      options.message = `Failed to delete node(s)! - ${JSON.stringify(result)}`
      options.type = 'danger'
    }

    if (window.notify) {
      window.notify(options)
    }

    setSpinnerDisplay('d-none')

    removePopper(el.id(), `popper-${el.id()}`, poppers)
  }

  return <Card className="border-dark">
    <CardBody>
      <CardTitle
        tag="h5"
        className="mw-100 mb-4"
        style={{ minWidth: '50vw' }}
      >
        Delete {data.title}
        <CloseButton
          divKey={`popper-${el.id()}`}
          popperKey={el.id()}
          poppers={poppers}
        />
      </CardTitle>
      <CardText tag="div" className="mw-100">
        <p>Are you sure? This will remove the selected node and ALL its descendants!</p>
        <Form onSubmit={handleSubmit} inline>
          <Row form>
            <Col xs={"auto"}>
              <FormGroup>
                <Button color="danger" onClick={handleSubmit}><Trash2/> Delete</Button>
              </FormGroup>
            </Col>
            <Col xs={"auto"}>
              <FormGroup>
                <Button color="secondary" onClick={() => removePopper(el.id(), `popper-${el.id()}`, poppers)}>
                  <XCircle/> Cancel
                </Button>
              </FormGroup>
            </Col>
            <Col xs={"auto"}><FormGroup><Spinner className={spinnerDisplay}/></FormGroup></Col>
          </Row>
        </Form>
      </CardText>
    </CardBody>
  </Card>
}
