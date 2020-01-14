<?php

$extpath = dirname(__FILE__).DIRECTORY_SEPARATOR;
$taopath = dirname(dirname(__FILE__)).DIRECTORY_SEPARATOR.'tao'.DIRECTORY_SEPARATOR;

return [
    'name' => 'taoFakeExtension',
    'label' => 'Fake extension',
    'description' => 'Dummy test extension',
    'license' => 'GPL-2.0',
    'version' => '1.2.3',
    'author' => 'Open Assessment Technologies, CRP Henri Tudor',
    'requires' => [
        'tao' => '>=21.0.1'
    ]
];
