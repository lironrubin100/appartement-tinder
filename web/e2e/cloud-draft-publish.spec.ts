import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
test.use({trace:'off',screenshot:'off',video:'off'});
for(const locale of ['he','en'])for(const width of [390,1280])test(`${locale} ${width}: cloud snapshot publication renders public rooms/photos without private address`,async({page})=>{
 const manifest=JSON.parse(readFileSync('.qa/task231/manifest.json','utf8')),en=locale==='en',prefix=en?'/en':'';
 await page.setViewportSize({width,height:844});const response=await page.goto(prefix+'/listings/'+manifest.published[0]);expect(response!.status()).toBe(200);
 await expect(page.getByRole('heading',{level:1})).toHaveText('Synthetic cloud publication 1');await expect(page.locator('body')).toContainText('₪2,100–2,600');
 const images=page.getByRole('img',{name:/Synthetic cloud publication 1/});await expect(images).toHaveCount(3);
 for(let i=0;i<3;i++){await images.nth(i).scrollIntoViewIfNeeded();await expect.poll(()=>images.nth(i).evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);}
 const html=await response!.text();expect(html).not.toContain('Synthetic task231 private address');for(const privatePath of manifest.paths[0])expect(html).not.toContain(privatePath);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(process.env.UX_SCREENSHOTS){mkdirSync(process.env.UX_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.UX_SCREENSHOTS,`publication-${locale}-${width}.png`),fullPage:true});}
});
