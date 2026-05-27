const fs = require('fs');
let c = fs.readFileSync('src/pages/WriteReview.tsx', 'utf8');

c = c.replace(
  '<input type="tel" {...register(\'bkash_number\')} className="w-full bg-neutral-50 pl-10 pr-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 outline-none focus:ring-emerald-500 focus:border-emerald-500" placeholder="017... where you sent money" />',
  '<input type="tel" {...register(\'bkash_number\', { pattern: { value: /^01\\d{9}$/, message: \'11 digits starting with 01\' } })} className={`w-full bg-neutral-50 pl-10 pr-4 py-3 rounded-xl border focus:ring-2 outline-none ${errors.bkash_number ? \'border-rose-500 focus:ring-rose-500 focus:border-rose-500\' : \'border-neutral-300 focus:ring-emerald-500 focus:border-emerald-500\'}`} placeholder="017... where you sent money" />\n{errors.bkash_number && <span className="text-rose-500 text-xs mt-1 block">{errors.bkash_number.message as string}</span>}'
);

c = c.replace(
  'const reviewType = watch(\'review_type\');\n  const pageUrl = watch(\'page_url\');',
  'const reviewType = watch(\'review_type\');\n  const pageUrl = watch(\'page_url\');\n  useEffect(() => { if (reviewType === "Fraud Report" && parseInt(watch("star_rating")||"0",10) > 2) { setValue("star_rating", "1") } }, [reviewType, watch, setValue]);'
);

c = c.replace(
  `onClick={() => {
                        const event = { target: { value: star.toString(), name: 'star_rating' } };
                        register('star_rating').onChange(event);
                     }}`,
  `onClick={() => {
                        if (reviewType === 'Fraud Report' && star > 2) return;
                        const event = { target: { value: star.toString(), name: 'star_rating' } };
                        register('star_rating').onChange(event);
                     }}`
);

fs.writeFileSync('src/pages/WriteReview.tsx', c);
