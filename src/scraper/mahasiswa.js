const { GoogleSpreadsheet } = require('google-spreadsheet')
const { getOffset } = require('../utils/helpers')
const { API_BASEURL } = require('../config')
const { search, scrape } = require('../schema/mahasiswa')
const puppeteer = require('../config/puppeteer')
const creds = require('../../api-secret.json')

const doScrape = url => scrape(url)
    .then(data => ({
        nim: data.nim,
        nama: data.nama,
        jenisKelamin: data.gender,
        kampus: data.kampus,
        jurusan: data.prodi,
        angkatan: data.angkatan,
        status: data.status,
        ijazah: data.ijazah
    }))
    .catch(err => {
        console.log(`An error occured doing scrape "${url}":`, err)
    })

async function main() {
    console.log('Doing scrape data mahasiswa....\n')
    let dataCount = 0
    const doc = new GoogleSpreadsheet('1Lg4X4ODzFQUb8e1pV0tW2ONfpRoK_pdr_lMmd2nhUHo')
    const url = encodeURI(`${API_BASEURL}/mahasiswa`)
    const browser = await puppeteer()
    const page = await browser.newPage()
    
    try {
        await doc.useServiceAccountAuth(creds)
        await doc.loadInfo()
        const sheet = doc.sheetsByIndex[0]
        
        await page.goto(url)
        await page.evaluate(search, {
            kampusID: , 
            prodiID: '',
            keyword: ''
        })

        await page.waitForNavigation()

        for (let i = 1; i < 1999; i++) {
            let dataCountPerPage = 0
            const offset = getOffset(i)

            if (offset > 1)
                await page.goto(`${url}/search/${offset}`)

            const hashUrls = await page.evaluate(() =>
                [...document.querySelectorAll('tr.tmiddle')]
                    .map(element => element
                        .children[2].
                        querySelector('a')
                        .href
                    )
            )

            console.log('Fetching data page:', i)
            const result = (await Promise.allSettled(hashUrls.map(url => doScrape(url)))
                .then(data => data.filter(res => res.status === 'fulfilled')))
                .map(data => data.value)
            console.log('Done!\n')

            for (data of result) {
                dataCount++
                dataCountPerPage++
                console.log(`Writing "${data.nim}" into spreadsheet...`)
                await sheet.addRow(data)
                console.log('Done!\n')
            }
            
            console.log(`Done Writing ${dataCountPerPage} from page ${i} into spreadsheet`)
        }
    } catch (reason) {
        console.error(reason)
    } finally {
        console.log(`Done writing ${dataCount} data into spreadsheet!`)
        // browser.close()
    }
}

main()