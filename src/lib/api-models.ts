// Friendly aliases over the GENERATED types (src/lib/api-types.ts). Never define API shapes by hand:
// if something is missing, request it from the backend through the mailbox.
import type { components } from './api-types'

type Schemas = components['schemas']

export type MetaResponse = Schemas['MetaResponse']
export type Limits = Schemas['Limits']
export type ProviderId = Schemas['ProviderId']
export type ExportLanguage = Schemas['ExportLanguage']

export type Invoice = Schemas['Invoice']
export type Party = Schemas['Party']
export type LineItem = Schemas['LineItem']
export type Tax = Schemas['Tax']
export type DocumentType = Schemas['DocumentType']

export type Validation = Schemas['Validation']
export type ValidationStatus = Schemas['ValidationStatus']
export type Issue = Schemas['Issue']
export type IssueSeverity = Schemas['IssueSeverity']

export type ExtractResponse = Schemas['ExtractResponse']
export type ExtractionResult = Schemas['ExtractionResult']
export type ExtractionSuccess = Schemas['ExtractionSuccess']
export type ExtractionFailure = Schemas['ExtractionFailure']
export type FileError = Schemas['FileError']

export type ValidateRequest = Schemas['ValidateRequest']
export type ValidateResponse = Schemas['ValidateResponse']
export type ExportRequest = Schemas['ExportRequest']
export type ExportOptions = Schemas['ExportOptions']

export type ProblemDetails = Schemas['ProblemDetails']
