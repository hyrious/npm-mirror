# @hyrious/npm-mirror

Do something under a custom registry, then rewrite them back to the default one.

> [!NOTE]
> It currently only works for `npm`, no `pnpm` or `bun` support.

## Usage

```console
$ npx @hyrious/npm-mirror
Enabling custom registry: http://registry.npmmirror.com
Updated .npmrc
Updated package-lock.json

$ npm i -D esbuild

$ npx @hyrious/npm-mirror
Resetting default registry...
Updated .npmrc
Updated package-lock.json
```

### Options

```console
$ npx @hyrious/npm-mirror [registry] [dir]
```

#### registry

Default: `http://registry.npmmirror.com` (A mirror of registry in China.)

Despite of passing CLI arguments, it can also be configured with the environment variable `NPM_MIRROR_REGISTRY`.

The CLI updates `.npmrc` and `package-lock.json` to use or not use the registry.
The trigger is whether `.npmrc` is configured to use that registry or there's at least one package using the registry in the lockfile.

If the `.npmrc` has different registry configured, it throws an error.

#### dir

Default: `process.cwd()`

The CLI searches `package-lock.json` from `dir`, then its parent dir and so on.

If you want to change the `dir` argument without touching `registry`, you can pass in `_` or `*` in the first argument, e.g.

```console
$ npx @hyrious/npm-mirror _ path/to/project
```

### CI

If environment variable `CI` is present, the CLI does nothing.

## License

MIT @ [hyrious](https://github.com/hyrious)
