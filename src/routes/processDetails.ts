import { get } from 'svelte/store'
import { type TableRecord } from './processTable'

function getParaText(p: HTMLParagraphElement) {
    let res = Array.from(p.childNodes)
        .map(node => {
            if (node.nodeType === Node.TEXT_NODE) 
                return node.textContent;

            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement
                if (el.tagName === 'BR')
                    return '\n';

                if (el.tagName === 'A')
                    return ' ' + el.innerText
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

    const cityTxt = getParaText(paragraphs[14])
    const city = cityTxt !== "No city provided" ? cityTxt : undefined

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