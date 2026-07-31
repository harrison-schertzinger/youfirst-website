# Email images are PERMANENT

Every file here may be referenced by an email that has already been sent, and a
sent email cannot be edited. Deleting one turns its header into a broken image
in somebody's inbox, forever.

This already happened once: tidying up "old" header builds 404'd the headers in
75 test emails that were sitting in Harrison's inbox.

RULE: add files here, never remove them. Superseding a header means building a
new file and pointing HEADER_DEFAULT at it — the old file stays.

Built by `node scripts/build-email-header.mjs`. Drop source photos in
`incoming/` (COPY them; don't drag a file the site is already using — that once
moved /tryouts' hero out of public/images/team/).
