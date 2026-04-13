import {
  BlockitClient,
  DOCS_MODE,
  type DocumentRef,
} from "@lark-opdev/block-docs-addon-api"
import { useEffect, useState } from "react"

const docMiniApp = new BlockitClient().initAPI()

export function useDocMiniApp() {
  const [docRef, setDocRef] = useState<DocumentRef | null>(null)
  const [editable, setEditable] = useState(false)

  useEffect(() => {
    const init = async () => {
      const ref = await docMiniApp.getActiveDocumentRef()
      setDocRef(ref)

      const permission =
        await docMiniApp.Service.Permission.getDocumentPermission(ref)
      const docsMode = await docMiniApp.Env.DocsMode.getDocsMode().catch(
        () => null,
      )
      setEditable(!!permission?.editable && docsMode === DOCS_MODE.EDITING)
    }

    init()

    const onPermissionChange = async () => {
      if (!docRef) return
      const permission =
        await docMiniApp.Service.Permission.getDocumentPermission(docRef)
      const docsMode = await docMiniApp.Env.DocsMode.getDocsMode().catch(
        () => null,
      )
      setEditable(!!permission?.editable && docsMode === DOCS_MODE.EDITING)
    }

    if (docRef) {
      docMiniApp.Service.Permission.onDocumentPermissionChange(
        docRef,
        onPermissionChange,
      )
    }

    return () => {
      if (docRef) {
        docMiniApp.Service.Permission.offDocumentPermissionChange(
          docRef,
          onPermissionChange,
        )
      }
    }
  }, [docRef])

  return { docMiniApp, docRef, editable }
}
