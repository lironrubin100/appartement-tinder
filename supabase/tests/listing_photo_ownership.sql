-- Run inside BEGIN/ROLLBACK after the photo ownership migration.
select set_config('request.jwt.claim.sub','7f66dea4-87e2-4840-bebf-76178f6c4878',true);
set local role authenticated;
insert into storage.objects(bucket_id,name,owner_id) values('apartment-photos','00000000-0000-4000-8000-000000000987/1.jpg','7f66dea4-87e2-4840-bebf-76178f6c4878');
reset role;
select set_config('request.jwt.claim.sub','f1bd5fe6-0091-4496-b438-fe8ecc9d7b67',true);
set local role authenticated;
do $$ declare affected integer; begin
  update storage.objects set metadata='{}' where bucket_id='apartment-photos' and name='00000000-0000-4000-8000-000000000987/1.jpg';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Another account changed photo'; end if;
end $$;
reset role;
select 'PASS: opaque photo paths upload; non-owner writes denied' as verification;
