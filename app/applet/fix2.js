const fs = require('fs');
let c = fs.readFileSync('src/pages/WriteReview.tsx', 'utf8');

c = c.replace(
  'const { register, handleSubmit, watch, reset, getValues, formState: { errors } } = useForm({',
  'const { register, handleSubmit, watch, reset, getValues, setValue, formState: { errors } } = useForm({'
);

let find1 = '<input {...register(\'contact_number\')} type="tel" className="w-full bg-white px-3 py-2 rounded-lg border border-neutral-300 focus:ring-2 outline-none focus:ring-emerald-500 text-sm" placeholder="Main phone..." />';
let rep1 = '<input {...register(\'contact_number\', { pattern: { value: /^01\\d{9}$/, message: \'11 digits starting with 01\' } })} type="tel" className={errors.contact_number ? "border-red-500 w-full bg-white px-3 py-2 rounded-lg border focus:ring-2 outline-none focus:ring-red-500 text-sm" : "border-neutral-300 w-full bg-white px-3 py-2 rounded-lg border focus:ring-2 outline-none focus:ring-emerald-500 text-sm"} placeholder="Main phone..." />\n{errors.contact_number && <p className="text-red-500 text-xs mt-1">{errors.contact_number.message as string}</p>}';

c = c.replace(find1, rep1);

let find2 = '<input type="tel" {...register(\'bkash_number\')} className="w-full bg-neutral-50 pl-10 pr-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 outline-none focus:ring-emerald-500 focus:border-emerald-500" placeholder="017... where you sent money" />';
let rep2 = '<input type="tel" {...register(\'bkash_number\', { pattern: { value: /^01\\d{9}$/, message: \'11 digits starting with 01\' } })} className={errors.bkash_number ? "border-red-500 w-full bg-neutral-50 pl-10 pr-4 py-3 rounded-xl border focus:ring-2 outline-none focus:ring-red-500 focus:border-red-500" : "border-neutral-300 w-full bg-neutral-50 pl-10 pr-4 py-3 rounded-xl border focus:ring-2 outline-none focus:ring-emerald-500 focus:border-emerald-500"} placeholder="017... where you sent money" />\n{errors.bkash_number && <p className="text-red-500 text-xs mt-1">{errors.bkash_number.message as string}</p>}';

c = c.replace(find2, rep2);

let find3 = 'const reviewType = watch(\'review_type\');';
let rep3 = 'const reviewType = watch(\'review_type\');\nReact.useEffect(() => {\n  if (reviewType === \'Fraud Report\') {\n      const currentStar = parseInt(watch(\'star_rating\'));\n      if (currentStar > 2) {\n          setValue(\'star_rating\', \'1\');\n      }\n  }\n}, [reviewType, watch, setValue]);';

c = c.replace(find3, rep3);

let find4 = 'const event = { target: { value: star.toString(), name: \'star_rating\' } };\n                        register(\'star_rating\').onChange(event);';
let rep4 = 'if (reviewType === \'Fraud Report\' && parseInt(star.toString()) > 2) {\n                           return;\n                        }\n                        const event = { target: { value: star.toString(), name: \'star_rating\' } };\n                        register(\'star_rating\').onChange(event);';

c = c.replace(find4, rep4);

fs.writeFileSync('src/pages/WriteReview.tsx', c);
console.log('Fixed');
