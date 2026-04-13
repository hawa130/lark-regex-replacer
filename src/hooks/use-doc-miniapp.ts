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

  // Initialize: fetch docRef only, permission is handled by the next effect
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const ref = await docMiniApp.getActiveDocumentRef()
      if (!cancelled) {
        setDocRef(ref)
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  // Permission tracking: runs on initial docRef and on changes
  useEffect(() => {
    if (!docRef) return

    let cancelled = false

    const updateEditable = async () => {
      const permission =
        await docMiniApp.Service.Permission.getDocumentPermission(docRef)
      const docsMode = await docMiniApp.Env.DocsMode.getDocsMode().catch(
        () => null,
      )
      if (!cancelled) {
        setEditable(!!permission?.editable && docsMode === DOCS_MODE.EDITING)
      }
    }

    updateEditable()

    docMiniApp.Service.Permission.onDocumentPermissionChange(
      docRef,
      updateEditable,
    )
    return () => {
      cancelled = true
      docMiniApp.Service.Permission.offDocumentPermissionChange(
        docRef,
        updateEditable,
      )
    }
  }, [docRef])

  // Document change tracking
  useEffect(() => {
    if (!docRef) return

    const handler = () => {
      for (const listener of changeListenersRef.current) {
        listener()
      }
    }

    docMiniApp.Events.onDocumentChange(docRef, handler)
    return () => {
      docMiniApp.Events.offDocumentChange(docRef, handler)
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
