const fs = require('fs');
let c = fs.readFileSync('src/pages/WriteReview.tsx', 'utf8');

c = c.replace(
  'const { register, handleSubmit, watch, reset, getValues, formState: { errors } } = useForm({',
  'const { register, handleSubmit, watch, reset, getValues, setValue, formState: { errors } } = useForm({'
);

c = c.replace(
  '<input {...register(\'contact_number\')} type="tel" className="w-full bg-white px-3 py-2 rounded-lg border border-neutral-300 focus:ring-2 outline-none focus:ring-emerald-500 text-sm" placeholder="Main phone..." />',
  '<input {...register(\'contact_number\', { pattern: { value: /^01\\d{9}$/, message: \'11 digits starting with 01\' } })} type="tel" className={`${errors.contact_number ? \'border-red-500\' : \'border-neutral-300\'} w-full bg-white px-3 py-2 rounded-lg border focus:ring-2 outline-none focus:ring-emerald-500 text-sm`} placeholder="Main phone..." />\n{errors.contact_number && <p className="text-red-500 text-xs mt-1">{errors.contact_number.message as string}</p>}'
);

c = c.replace(
  '<input type="tel" {...register(\'bkash_number\')} className="w-full bg-neutral-50 pl-10 pr-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 outline-none focus:ring-emerald-500 focus:border-emerald-500" placeholder="017... where you sent money" />',
  '<input type="tel" {...register(\'bkash_number\', { pattern: { value: /^01\\d{9}$/, message: \'Must be 11 digits starting with 01\' } })} className={`${errors.bkash_number ? \'border-red-500\' : \'border-neutral-300\'} w-full bg-neutral-50 pl-10 pr-4 py-3 rounded-xl border focus:ring-2 outline-none focus:ring-emerald-500 focus:border-emerald-500`} placeholder="017... where you sent money" />\n{errors.bkash_number && <p className="text-red-500 text-xs mt-1">{errors.bkash_number.message as string}</p>}'
);

c = c.replace(
  'const reviewType = watch(\'review_type\');',
  `const reviewType = watch('review_type');
  
  useEffect(() => {
    if (reviewType === 'Fraud Report') {
        const currentStar = parseInt(watch('star_rating'));
        if (currentStar > 2) {
            setValue('star_rating', '1');
        }
    }
  }, [reviewType, watch, setValue]);`
);

c = c.replace(
  `const event = { target: { value: star.toString(), name: 'star_rating' } };
                        register('star_rating').onChange(event);`,
  `if (reviewType === 'Fraud Report' && parseInt(star.toString()) > 2) {
                           return;
                        }
                        const event = { target: { value: star.toString(), name: 'star_rating' } };
                        register('star_rating').onChange(event);`
);

console.log(fs.writeFileSync('src/pages/WriteReview.tsx', c));
