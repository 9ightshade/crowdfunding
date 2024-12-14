/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'
import { Route as CampaignCampaignIdImport } from './routes/campaign.$campaignId'

// Create/Update Routes

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const CampaignCampaignIdRoute = CampaignCampaignIdImport.update({
  id: '/campaign/$campaignId',
  path: '/campaign/$campaignId',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/campaign/$campaignId': {
      id: '/campaign/$campaignId'
      path: '/campaign/$campaignId'
      fullPath: '/campaign/$campaignId'
      preLoaderRoute: typeof CampaignCampaignIdImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/campaign/$campaignId': typeof CampaignCampaignIdRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/campaign/$campaignId': typeof CampaignCampaignIdRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/campaign/$campaignId': typeof CampaignCampaignIdRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/campaign/$campaignId'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/campaign/$campaignId'
  id: '__root__' | '/' | '/campaign/$campaignId'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  CampaignCampaignIdRoute: typeof CampaignCampaignIdRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  CampaignCampaignIdRoute: CampaignCampaignIdRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/campaign/$campaignId"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/campaign/$campaignId": {
      "filePath": "campaign.$campaignId.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
