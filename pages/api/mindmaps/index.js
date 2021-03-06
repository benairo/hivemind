import { aql } from 'arangojs'
import db, { rg } from '../../../utils/arangoWrapper'
import { verifyIdToken } from '../../../utils/auth/firebaseAdmin'

const MindMapsAPI = async (req, res) => {
  const { token } = req.headers

  try {
    const claims = await verifyIdToken(token)
    const key = claims.uid
    const userId = `users/${key}`
    let mindmap, response, message

    switch (req.method) {
      case 'GET':
        const query = aql`
          for v, e in 1
          outbound ${userId}
          graph 'mindmaps'
          
          return { mindmap: v, access: e }
        `
        const cursor = await db.query(query)
        const mindmaps = await cursor.all()

        return res.status(200).json(mindmaps)

      case 'POST':
        const { name } = req.body
        mindmap = {
          name,
          isRoot: true,
          title: name,
          createdBy: userId
        }
        response = await rg.post('/document/mindmaps', mindmap)

        if (response.statusCode === 201) {
          mindmap = response.body

          const access = {
            _from: `users/${key}`,
            _to: mindmap._id,
            access: 'admin'
          }
          response = await rg.post('/document/access', access, { silent: true })
          message = response.statusCode === 201 ? 'Mindmap created.' : response.body
        } else {
          message = response.body
        }

        return res.status(response.statusCode).json({ message })

      case 'PATCH':
        const { summary, content, _rev, _id, title } = req.body
        mindmap = {
          _id,
          title,
          summary,
          content,
          _rev,
          lastUpdatedBy: userId
        }

        response = await rg.patch('/document/mindmaps', mindmap,
          {
            keepNull: false,
            ignoreRevs: false
          })

        return res.status(response.statusCode).json(response.body)
    }
  }
  catch (error) {
    console.error(error.message, error.stack)
    return res.status(401).json({ message: 'Access Denied.' })
  }
}

export default MindMapsAPI
