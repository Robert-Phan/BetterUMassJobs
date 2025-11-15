import { get } from 'svelte/store'
import { type TableRecord } from './processTable'

function decodeCloudflareEmail(encoded: string) {
    if (encoded.length < 2)
        return ''

    const key = parseInt(encoded.slice(0, 2), 16)
    if (Number.isNaN(key))
        return ''

    let email = ''
    for (let i = 2; i < encoded.length; i += 2) {
        const charCode = parseInt(encoded.slice(i, i + 2), 16)
        if (Number.isNaN(charCode))
            continue
        email += String.fromCharCode(charCode ^ key)
    }
    return email
}

function getParaText(p: HTMLParagraphElement) {
    let res = Array.from(p.childNodes)
        .map(node => {
            if (node.nodeType === Node.TEXT_NODE) 
                return node.textContent;

            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement
                if (el.tagName === 'BR')
                    return '\n';

                if (el.tagName === 'A') {
                    const cloudflareEl = (el.matches('[data-cfemail]') ? el : el.querySelector('[data-cfemail]')) as HTMLElement | null
                    const encoded = cloudflareEl?.getAttribute('data-cfemail') ?? undefined
                    if (encoded)
                        return ' ' + decodeCloudflareEmail(encoded)

                    return ' ' + el.innerText
                }
            }

            return ''; // ignore other elements
        })
        .slice(2)
        .join('')
        .trim()

    return res;
}

type PostingDetails = {
    description: string
    hourlyPayRate: number
    onBusRoute: boolean
    howToApply: string
    website?: string
    contact: string
    contactEmail: string
    contactPhone?: string
    streetAddress?: string
    city?: string
    state: string
    departmentInfo?: string
}

function normalizeCity(value: string) {
    let normalized = value
    normalized = normalized.replace(/\s+MA$/i, '')
    normalized = normalized.replace(/[^\w ]/g, '')
    normalized = normalized.replace(/\s+/g, ' ')
    normalized = normalized.toLowerCase()
    normalized = normalized.replace(/\b\w/g, char => char.toUpperCase())
    return normalized.trim()
}

export function processDetails(doc: Document): PostingDetails {
    const paragraphs = Array.from(doc.querySelectorAll('p'));

    const description = getParaText(paragraphs[1]);

    const hourlyPayRateTxt = getParaText(paragraphs[2])
    const hourlyPayRate = Number.parseInt(hourlyPayRateTxt.slice(1))

    const onBusRoute = getParaText(paragraphs[5])[0] === 'O'

    const howToApply = getParaText(paragraphs[8])

    const websiteTxt = getParaText(paragraphs[9])
    const website = websiteTxt !== "No web site provided" ? websiteTxt : undefined
    
    const contact = getParaText(paragraphs[10])
    const contactEmail = getParaText(paragraphs[11])

    const contactPhoneTxt = getParaText(paragraphs[12])
    const contactPhone = contactPhoneTxt !== "No phone number provided" ? contactPhoneTxt : undefined

    const streetAddressTxt = getParaText(paragraphs[13])
    const streetAddress = streetAddressTxt !== "No address provided" ? streetAddressTxt : undefined

    const rawCityTxt = getParaText(paragraphs[14])
    const cityTxt = normalizeCity(rawCityTxt)
    const city = rawCityTxt !== "No city provided" ? cityTxt : undefined

    const state = getParaText(paragraphs[15])

    const departmentInfoTxt = getParaText(paragraphs[17])
    const departmentInfo = departmentInfoTxt !== '---' ? departmentInfoTxt : undefined

    return {
        description,
        hourlyPayRate,
        onBusRoute,
        howToApply,
        website,
        contact,
        contactEmail,
        contactPhone,
        streetAddress,
        city,
        state,
        departmentInfo,
    }
}

export type JobPosting = TableRecord & PostingDetails
