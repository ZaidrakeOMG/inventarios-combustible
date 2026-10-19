(function () {
  const STORAGE_SERVER = 'aryInventariosSqlServer'
  const STORAGE_DATABASE = 'aryInventariosSqlDatabase'
  const nativeFetch = window.fetch.bind(window)

  function getSelection() {
    return {
      server: localStorage.getItem(STORAGE_SERVER) || '',
      database: localStorage.getItem(STORAGE_DATABASE) || ''
    }
  }

  function setSelection(server, database) {
    const serverValue = String(server || '').trim()
    const databaseValue = String(database || '').trim()

    if (serverValue) {
      localStorage.setItem(STORAGE_SERVER, serverValue)
    } else {
      localStorage.removeItem(STORAGE_SERVER)
    }

    if (serverValue && databaseValue) {
      localStorage.setItem(STORAGE_DATABASE, databaseValue)
    } else {
      localStorage.removeItem(STORAGE_DATABASE)
    }
  }

  window.fetch = function arySqlFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : ''
    const isApi = url.startsWith('/api/')
    const isSqlConfig = url.startsWith('/api/sql-servidores')

    if (!isApi || isSqlConfig) {
      return nativeFetch(input, init)
    }

    const selection = getSelection()

    if (!selection.server) {
      return nativeFetch(input, init)
    }

    const headers = new Headers(init.headers || {})
    headers.set('X-SQL-Server', selection.server)

    if (selection.database) {
      headers.set('X-SQL-Database', selection.database)
    }

    return nativeFetch(input, {
      ...init,
      headers
    })
  }

  window.ArySqlSource = {
    getSelection,
    setSelection,
    nativeFetch
  }
})()
