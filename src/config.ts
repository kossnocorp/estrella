import * as filepath from "path"
import { sha1 } from "./hash"
import {
  BuildConfig as UserBuildConfig,
  BuildContext as UserBuildContext,
} from "../estrella.d"


export interface BuildContext extends UserBuildContext {
  addCancelCallback(f :()=>void) :void
}


export interface BuildConfig extends UserBuildConfig {
  cwd :string // never undefined

  // unique but stable ID of the build, used for temp files and caching
  readonly projectID :string

  // absolute path to outfile (empty if outfile is empty)
  readonly outfileAbs :string

  setOutfile(outfile :string) :void

  // Computes projectID based on current configuration and updates value of this.projectID.
  // Depends on the following config properties:
  // - cwd
  // - outfile
  // - entryPoints
  //
  updateProjectID() :string

  // true if the build is cancelled (BuildProcess.cancel() was called)
  buildIsCancelled :boolean

  // true if outfile is a temporary file
  outfileIsTemporary :boolean

  // true if metafile is a temporary file
  metafileIsTemporary :boolean
}

export function createBuildConfig(userConfig :UserBuildConfig, defaultCwd :string) :BuildConfig {
  let projectID = userConfig.cwd || "?"
  let buildIsCancelled = false
  let outfileIsTemporary = false
  let metafileIsTemporary = false
  let outfileAbs = ""

  function computeProjectID(config :UserBuildConfig) :string {
    const projectKey = [config.cwd, config.outfile||"", ...(
      Array.isArray(config.entryPoints) ? config.entryPoints :
      config.entryPoints ? [config.entryPoints] :
      []
    )].join(filepath.delimiter)
    return base36EncodeBuf(sha1(Buffer.from(projectKey, "utf8")))
  }

  const cwd = userConfig.cwd ? filepath.resolve(userConfig.cwd) : defaultCwd

  const config :BuildConfig = Object.create({
    get outfileAbs() :string { return outfileAbs },

    setOutfile(outfile :string) :void {
      config.outfile = outfile
      outfileAbs = (
        outfile && outfile != "-" ? filepath.resolve(config.cwd, outfile) :
        ""
      )
    },

    get projectID() :string { return projectID },

    updateProjectID() :string {
      projectID = computeProjectID(config)
      return projectID
    },

    get buildIsCancelled() :boolean { return buildIsCancelled },
    set buildIsCancelled(y :boolean) { buildIsCancelled = y },

    get outfileIsTemporary() :boolean { return outfileIsTemporary },
    set outfileIsTemporary(y :boolean) { outfileIsTemporary = y },

    get metafileIsTemporary() :boolean { return metafileIsTemporary },
    set metafileIsTemporary(y :boolean) { metafileIsTemporary = y },
  })

  Object.assign(config, userConfig)

  config.cwd = cwd
  config.setOutfile(userConfig.outfile || "")

  return config
}


function base36EncodeBuf(buf :Buffer) {
  let s = ""
  for (let i = 0; i < buf.length; i += 4) {
    s += buf.readUInt32LE(i).toString(36)
  }
  return s
}
