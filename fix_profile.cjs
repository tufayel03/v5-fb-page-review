const fs = require('fs');
let c = fs.readFileSync('src/pages/PageProfile.tsx', 'utf8');

const shareCodeStr = `const handleShare = async (review) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: \`Review by \${review.is_anonymous ? 'Anonymous' : review.username}\`,
          text: review.title,
          url: window.location.href + '#review-' + review.id,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href + '#review-' + review.id);
        alert('Link copied to clipboard');
      }
    } catch(e) {
      console.log(e);
    }
  };

  const handleUseful = (reviewId) => {
    alert('Thank you! Your feedback has been recorded.');
  };`;

c = c.replace('const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);', 'const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);\n' + shareCodeStr);

c = c.replace('<button className="flex items-center gap-2 hover:text-[#2b3ff0] transition-colors group">', '<button onClick={() => handleUseful(review.id)} className="flex items-center gap-2 hover:text-[#2b3ff0] transition-colors group">');

c = c.replace('<button className="flex items-center gap-2 hover:text-slate-900 transition-colors group">', '<button onClick={(e) => { e.preventDefault(); handleShare(review); }} className="flex items-center gap-2 hover:text-slate-900 transition-colors group">');

fs.writeFileSync('src/pages/PageProfile.tsx', c);
