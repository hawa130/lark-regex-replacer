import {
  BlockitClient,
  DOCS_MODE,
  type DocumentRef,
} from "@lark-opdev/block-docs-addon-api"
import { useCallback, useEffect, useRef, useState } from "react"

const docMiniApp = new BlockitClient().initAPI()

export function useDocMiniApp() {
  const [docRef, setDocRef] = useState<DocumentRef | null>(null)
  const [editable, setEditable] = useState(false)
  const changeListenersRef = useRef<Set<() => void>>(new Set())

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
  }, [])

  // Permission tracking
  useEffect(() => {
    if (!docRef) return

    const onPermissionChange = async () => {
      const permission =
        await docMiniApp.Service.Permission.getDocumentPermission(docRef)
      const docsMode = await docMiniApp.Env.DocsMode.getDocsMode().catch(
        () => null,
      )
      setEditable(!!permission?.editable && docsMode === DOCS_MODE.EDITING)
    }

    docMiniApp.Service.Permission.onDocumentPermissionChange(
      docRef,
      onPermissionChange,
    )
    return () => {
      docMiniApp.Service.Permission.offDocumentPermissionChange(
        docRef,
        onPermissionChange,
      )
    }
  }, [docRef])

  // Document change tracking
  useEffect(() => {
    if (!docRef) return

    const onDocumentChange = () => {
      for (const listener of changeListenersRef.current) {
        listener()
      }
    }

    docMiniApp.Events.onDocumentChange(docRef, onDocumentChange)
    return () => {
      docMiniApp.Events.offDocumentChange(docRef, onDocumentChange)
    }
  }, [docRef])

  const onDocumentChange = useCallback((listener: () => void) => {
    changeListenersRef.current.add(listener)
    return () => {
      changeListenersRef.current.delete(listener)
    }
  }, [])

  return { docMiniApp, docRef, editable, onDocumentChange }
}
